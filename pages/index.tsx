import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

interface EvaluationResult {
  success_score: number;
  estimated_valuation: number;
  is_max_valuation: boolean;
  valuation_range: {
    low: number;
    high: number;
  };
  breakdown: {
    revenue: number;
    traffic: number;
    community: number;
    multiplier: number;
  };
}

interface TopPerformers {
  mainCategories: Array<{ name: string; successRate: number; avgPrice: number; projects: number }>;
  specificCategories: Array<{ name: string; successRate: number; avgPrice: number; projects: number }>;
  keywords: Array<{ word: string; frequency: number; avgPrice: number }>;
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformers | null>(null);
  const [formData, setFormData] = useState({
    tagline: '',
    user_base: '',
    traffic: '',
    monthly_cost: '',
    categories: [] as string[]
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

  // Load categories on component mount
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Load top performers data
  useEffect(() => {
    console.log('Loading top performers...');
    fetch('/api/top-performers')
      .then(res => {
        console.log('Top performers response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Top performers data:', data);
        setTopPerformers(data.topPerformers);
      })
      .catch(err => {
        console.error('Failed to load top performers:', err);
      });
  }, []);

  const performAnalysis = useCallback(async (data: typeof formData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const requestData = {
      tagline: data.tagline,
      user_base: parseInt(data.user_base) || 0,
      traffic: parseInt(data.traffic) || 0,
      monthly_cost: parseInt(data.monthly_cost) || 0,
      categories: data.categories,
    };

    try {
      const response = await fetch('/api/successscore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      const result = await response.json();
      
      // Calculate breakdown for display - these should match backend logic more closely
      const userBase = requestData.user_base;
      const monthlyTraffic = requestData.traffic;
      const estimatedMRR = Math.max(userBase * 0.03, 0); // Match backend conversion rate
      
      // Calculate base components using backend logic
      let userValue = 0;
      if (userBase >= 10000) userValue = userBase * 8;
      else if (userBase >= 5000) userValue = userBase * 6;
      else if (userBase >= 2500) userValue = userBase * 5;
      else if (userBase >= 1000) userValue = userBase * 3;
      else if (userBase >= 500) userValue = userBase * 2;
      else userValue = userBase * 1;

      let trafficValue = 0;
      if (monthlyTraffic >= 100000) trafficValue = monthlyTraffic * 0.15;
      else if (monthlyTraffic >= 50000) trafficValue = monthlyTraffic * 0.12;
      else if (monthlyTraffic >= 20000) trafficValue = monthlyTraffic * 0.10;
      else if (monthlyTraffic >= 8000) trafficValue = monthlyTraffic * 0.08;
      else if (monthlyTraffic >= 3000) trafficValue = monthlyTraffic * 0.05;
      else trafficValue = monthlyTraffic * 0.02;

      const revenueValue = estimatedMRR * 12 * 1.8; // Match backend: MRR * 12 * 1.8
      const baseValue = userValue + trafficValue + revenueValue;
      
      // Calculate effective multiplier by reverse engineering from final valuation
      const effectiveMultiplier = baseValue > 0 ? result.estimatedValuation / baseValue : 1.0;
      
      setResult({
        success_score: result.successScore || 50,
        estimated_valuation: result.estimatedValuation || 5000,
        is_max_valuation: result.isMaxValuation || false,
        valuation_range: result.valuationRange || { low: 3500, high: 6500 },
        breakdown: {
          revenue: Math.round(revenueValue),
          traffic: Math.round(trafficValue),
          community: Math.round(userValue),
          multiplier: Math.round(effectiveMultiplier * 100) / 100 // Round to 2 decimal places
        }
      });
    } catch (err) {
      setError('Failed to evaluate startup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load form data from URL parameters and trigger analysis
  useEffect(() => {
    if (router.isReady && Object.keys(router.query).length > 0) {
      const { tagline, user_base, traffic, monthly_cost, categories } = router.query;
      
      if (tagline) {
        const urlFormData = {
          tagline: tagline as string,
          user_base: user_base as string || '',
          traffic: traffic as string || '',
          monthly_cost: monthly_cost as string || '',
          categories: categories ? (Array.isArray(categories) ? categories : [categories as string]) : []
        };
        
        setFormData(urlFormData);
        
        // Auto-trigger analysis
        performAnalysis(urlFormData);
      }
    }
  }, [router.isReady, router.query, performAnalysis]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const form = new FormData(event.currentTarget);
    const selectedCategories = Array.from(form.getAll('categories')) as string[];
    const data = {
      tagline: form.get('tagline') as string,
      user_base: form.get('user_base') as string || '',
      traffic: form.get('traffic') as string || '',
      monthly_cost: form.get('monthly_cost') as string || '',
      categories: selectedCategories
    };

    setFormData(data);

    // Update URL with parameters
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'categories' && Array.isArray(value)) {
        value.forEach(cat => params.append('categories', cat));
      } else if (value && typeof value === 'string') {
        params.set(key, value);
      }
    });
    
    router.push(`/?${params.toString()}`, undefined, { shallow: true });
    
    // Perform analysis
    await performAnalysis(data);
  };

  const copyAnalysisUrl = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <>
      <Head>
        <title>Pre-Revenue | Free Startup Evaluation Tool - Powered by Little Exits</title>
      </Head>
      <div className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        
        {/* Header */}
        <header className="text-center mb-10 sm:mb-14">
          <div className="flex items-center justify-center gap-3 mb-3 sm:mb-4">
            <Image 
              src="/Little Exits Icon Dark.png" 
              alt="Little Exits Logo" 
              width={40}
              height={40}
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
              Pre-Revenue
            </h1>
          </div>
          <p className="text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed px-2">
            Evaluate your pre-revenue startup with a tagline and traction metrics. 
            Analysis uses <a href="https://littleexits.com" className="text-blue-600 hover:text-blue-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer">Little Exits</a> marketplace data from 200+ exits.
          </p>
          
          {/* Little Exits Branding */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500">
            <span>Powered by</span>
            <a 
              href="https://littleexits.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
            >
              <Image 
                src="/Little Exits Icon Dark.png" 
                alt="Little Exits" 
                width={18}
                height={18}
                className="w-[18px] h-[18px] rounded"
              />
              <span className="font-medium">Little Exits</span>
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Form Section */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-sm min-h-[560px]">
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
                  Input
                </h2>
              </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">
                  Tagline
                  <span className="text-neutral-500 text-xs font-normal ml-2">(max 128 characters)</span>
                </label>
                <input
                  type="text"
                  name="tagline"
                  required
                  maxLength={128}
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                  placeholder="AI-powered task automation for small businesses"
                />
                <div className="text-xs text-neutral-500">
                  {formData.tagline.length}/128 characters
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Users
                  </label>
                  <input
                    type="number"
                    name="user_base"
                    min="0"
                    value={formData.user_base}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_base: e.target.value }))}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Monthly Unique Visitors
                  </label>
                  <input
                    type="number"
                    name="traffic"
                    min="0"
                    value={formData.traffic}
                    onChange={(e) => setFormData(prev => ({ ...prev, traffic: e.target.value }))}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Monthly Costs ($)
                  </label>
                  <input
                    type="number"
                    name="monthly_cost"
                    min="0"
                    value={formData.monthly_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_cost: e.target.value }))}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Categories
                    <span className="text-neutral-500 text-xs font-normal ml-2">(select up to 3)</span>
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                      value=""
                      onChange={(e) => {
                        const selectedCategory = e.target.value;
                        if (selectedCategory && !formData.categories.includes(selectedCategory) && formData.categories.length < 3) {
                          setFormData(prev => ({ 
                            ...prev, 
                            categories: [...prev.categories, selectedCategory]
                          }));
                        }
                        e.target.value = "";
                      }}
                      disabled={formData.categories.length >= 3}
                    >
                      <option value="" disabled>
                        {formData.categories.length >= 3 ? "Maximum 3 categories selected" : "Add a category..."}
                      </option>
                      {categories
                        .filter(category => !formData.categories.includes(category))
                        .map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                    </select>
                    
                    {/* Hidden inputs for form submission */}
                    {formData.categories.map((category) => (
                      <input 
                        key={category}
                        type="hidden" 
                        name="categories" 
                        value={category} 
                      />
                    ))}
                  </div>
                  
                  {/* Selected Categories Tags */}
                  {formData.categories.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-neutral-600 mb-2">
                        Selected ({formData.categories.length}/3):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.categories.map((category) => (
                          <span 
                            key={category} 
                            className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-blue-800 text-sm rounded-md border border-blue-200"
                          >
                            <span>{category}</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ 
                                ...prev, 
                                categories: prev.categories.filter(c => c !== category) 
                              }))}
                              className="text-blue-700 hover:text-blue-900 text-lg leading-none font-medium"
                              title={`Remove ${category}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 disabled:text-neutral-500 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 focus:ring-offset-white"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                ) : (
                  'Evaluate'
                )}
              </button>
            </form>              {error && (
                <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-sm min-h-[560px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
                  Results
                </h2>
              </div>
              {result && (
                <button
                  onClick={copyAnalysisUrl}
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700 text-sm"
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Share link
                    </>
                  )}
                </button>
              )}
            </div>

            {!result && !isLoading && (
              <div className="text-center text-neutral-500 py-14">
                <div className="w-14 h-14 mx-auto mb-4 bg-neutral-100 rounded-xl flex items-center justify-center border border-neutral-200">
                  <svg className="w-7 h-7 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-base">Enter your startup data to get an evaluation</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-neutral-500 py-14">
                <div className="w-8 h-8 border-2 border-neutral-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-base">Processing your data...</p>
                <p className="text-sm text-neutral-500 mt-2">Analyzing market trends and calculating your score</p>
              </div>
            )}

            {result && (
              <div className="space-y-4 sm:space-y-6">
                
                {/* Success Score */}
                <div className={`rounded-xl p-4 sm:p-5 ${
                  result.success_score >= 60 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : result.success_score >= 40 
                    ? 'bg-amber-50 border border-amber-200'
                    : result.success_score >= 20
                    ? 'bg-orange-50 border border-orange-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="text-center">
                    <div className={`text-4xl sm:text-5xl font-bold mb-2 ${
                      result.success_score >= 60 
                        ? 'text-emerald-700' 
                        : result.success_score >= 40 
                        ? 'text-amber-700'
                        : result.success_score >= 20
                        ? 'text-orange-700'
                        : 'text-red-700'
                    }`}>
                      {result.success_score}/100
                    </div>
                    <div className="text-neutral-700 text-base mb-2 flex items-center justify-center gap-2">
                      Success Score
                      <button
                        onClick={() => setShowScoreModal(true)}
                        className="text-neutral-500 hover:text-neutral-800 p-1 rounded-full hover:bg-white/80"
                        title="How your score was calculated"
                        type="button"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                      result.success_score >= 80 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : result.success_score >= 60 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : result.success_score >= 40 
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : result.success_score >= 20
                        ? 'bg-orange-100 text-orange-900 border border-orange-200'
                        : 'bg-red-100 text-red-900 border border-red-200'
                    }`}>
                      {result.success_score >= 80 && 'Exceptional potential - Likely to succeed'}
                      {result.success_score >= 60 && result.success_score < 80 && 'Strong potential - Good acquisition target'}
                      {result.success_score >= 40 && result.success_score < 60 && 'Moderate potential - Needs improvements'}
                      {result.success_score >= 20 && result.success_score < 40 && 'Significant issues - Major changes needed'}
                      {result.success_score < 20 && 'Critical problems - Consider pivot or major overhaul'}
                    </div>
                  </div>
                </div>

                {/* Valuation */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 relative overflow-hidden">
                  {result.is_max_valuation && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-100/80 to-transparent w-24 h-full pointer-events-none">
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 border border-amber-200 rounded-full px-2 py-1">
                        <svg className="w-3 h-3 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-amber-800 text-xs font-medium">MAX</span>
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-bold tracking-tight text-blue-900 mb-2 flex items-center justify-center gap-2 tabular-nums">
                      ${result.estimated_valuation.toLocaleString()}
                      {result.is_max_valuation && (
                        <div className="flex items-center gap-1">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-neutral-800 text-base mb-2">
                      {result.is_max_valuation ? (
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <span>Estimated Valuation</span>
                          <div className="flex items-center gap-1 text-amber-700 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="font-medium">Premium Tier</span>
                          </div>
                        </div>
                      ) : (
                        'Estimated Valuation'
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-neutral-600">
                      {result.is_max_valuation ? (
                        <div className="space-y-1">
                          <div>Exceptional potential reached</div>
                        </div>
                      ) : (
                        <>Range: ${result.valuation_range.low.toLocaleString()} - ${result.valuation_range.high.toLocaleString()}</>
                      )}
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Valuation calculation
                  </h3>
                  <div className="space-y-3 text-xs sm:text-sm">
                    
                    {/* Base Components */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200">
                      <div className="text-neutral-800 font-medium mb-3">Base components</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">
                            User base value (tiered pricing):
                          </span>
                          <span className="text-neutral-900 font-medium">${result.breakdown.community.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">
                            Traffic value (tiered pricing):
                          </span>
                          <span className="text-neutral-900 font-medium">${result.breakdown.traffic.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">
                            Revenue potential (MRR × 12 × 1.8):
                          </span>
                          <span className="text-neutral-900 font-medium">${result.breakdown.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="border-t border-neutral-200 mt-3 pt-3">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-neutral-700">Base subtotal</span>
                          <span className="text-neutral-900">${(result.breakdown.revenue + result.breakdown.traffic + result.breakdown.community).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Multipliers */}
                    <div className="bg-amber-50 rounded-lg p-3 sm:p-4 border border-amber-200">
                      <div className="text-amber-900 font-medium mb-3">Applied adjustments</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-600">
                            Combined multiplier:
                          </span>
                          <span className="text-amber-900 font-medium">{result.breakdown.multiplier}x</span>
                        </div>
                        <div className="text-xs text-neutral-600 space-y-1">
                          <div>Category performance multiplier</div>
                          {formData.categories.length > 1 && (
                            <div>{formData.categories.length === 2 ? '+5%' : '+10%'} diversification bonus</div>
                          )}
                          <div>Quality adjustments (tagline, efficiency)</div>
                          <div>Reality checks and penalty applications</div>
                        </div>
                      </div>
                    </div>

                    {/* Final Calculation */}
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-blue-800 text-sm sm:text-base font-semibold">
                          Final valuation
                        </span>
                        <span className="text-blue-950 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
                          ${result.estimated_valuation.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-600 mt-2 tabular-nums">
                        ${(result.breakdown.revenue + result.breakdown.traffic + result.breakdown.community).toLocaleString()} × {result.breakdown.multiplier} = ${result.estimated_valuation.toLocaleString()}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-lg p-3 border border-neutral-200">
                      <div className="text-xs text-neutral-600 space-y-1.5">
                        <p>User and traffic values use tiered pricing based on performance benchmarks.</p>
                        <p>Combined multiplier includes category, quality, efficiency, and penalty adjustments.</p>
                        <p>Reality checks may cap valuations for poor-performing startups.</p>
                        <p>Maximum valuation cap: $100,000 for pre-revenue startups.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Sources */}
                <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Data sources
                  </h3>
                  <div className="text-xs sm:text-sm text-neutral-600 space-y-2">
                    <p>
                      Based on 200+ successful exits from{' '}
                      <a href="https://littleexits.com" className="text-blue-600 hover:text-blue-800 underline underline-offset-2" target="_blank" rel="noopener noreferrer">Little Exits</a>
                      {' '}marketplace.
                    </p>
                    <p>Market multiples updated weekly from real transaction data.</p>
                    <p>Conversion rates derived from SaaS and startup benchmarks.</p>
                    <p>Category adjustments reflect actual market performance by sector.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Categories - Below Analysis Results */}
        {topPerformers && (
          <div className="mt-10 bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Market performance
              </h3>
              <p className="text-neutral-600 text-sm">
                Real sales data from <a href="https://littleexits.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Little Exits</a>. 
                Averages reflect completed transactions.
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Main Categories */}
              <div className="bg-blue-50 p-5 sm:p-6 rounded-xl border border-blue-200 w-full">
                <h4 className="text-blue-800 font-semibold mb-4 text-base flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Main categories
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {topPerformers.mainCategories.slice(0, 4).map((cat, idx) => (
                    <div key={idx} className="bg-white rounded-lg border border-blue-100 p-4 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="text-neutral-900 font-medium text-sm break-words">{cat.name}</span>
                        <div className="text-blue-700 font-bold text-lg shrink-0">{Math.round(cat.successRate * 100)}%</div>
                      </div>
                      <div className="text-center text-xs text-neutral-600 mb-3">
                        {cat.projects} sold, ${(cat.avgPrice / 1000).toFixed(0)}k avg
                      </div>
                      <div className="mt-auto">
                        <div className="bg-blue-100 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round(cat.successRate * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Specific Categories */}
              <div className="bg-emerald-50 p-5 sm:p-6 rounded-xl border border-emerald-200 w-full">
                <h4 className="text-emerald-800 font-semibold mb-4 text-base flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Specific categories
                </h4>
                <div className="w-full flex justify-center">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl w-full">
                    {topPerformers.specificCategories.slice(0, 4).map((cat, idx) => (
                      <div key={idx} className="bg-white rounded-lg border border-emerald-100 p-5 h-full flex flex-col min-w-0">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="text-neutral-900 font-medium text-sm break-words">{cat.name}</span>
                          <div className="text-emerald-700 font-bold text-xl shrink-0">{Math.round(cat.successRate * 100)}%</div>
                        </div>
                        <div className="text-center text-sm text-neutral-600 mb-3">
                          {cat.projects} sold, ${(cat.avgPrice / 1000).toFixed(0)}k avg
                        </div>
                        <div className="mt-auto">
                          <div className="bg-emerald-100 rounded-full h-2">
                            <div 
                              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.round(cat.successRate * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Top Keywords */}
              <div className="bg-amber-50 p-5 sm:p-6 rounded-xl border border-amber-200 w-full">
                <h4 className="text-amber-900 font-semibold mb-4 text-base flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  High-value keywords
                </h4>
                <div className="w-full flex justify-center">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-6xl w-full">
                    {topPerformers.keywords.slice(0, 5).map((keyword, idx) => (
                      <div key={idx} className="bg-white rounded-lg border border-amber-100 p-5 h-full flex flex-col min-w-0">
                        <div className="text-center flex-1 flex flex-col justify-center">
                          <div className="text-neutral-900 font-medium text-sm mb-2 break-words">&quot;{keyword.word}&quot;</div>
                          <div className="text-amber-800 font-bold text-xl mb-2">{keyword.frequency}×</div>
                          <div className="text-sm text-neutral-600 mt-auto">
                            <div>mentioned</div>
                            <div>${(keyword.avgPrice / 1000).toFixed(0)}k sale price</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              <p className="text-sm text-neutral-600 flex items-start gap-2">
                <svg className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Data from <a href="https://littleexits.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline underline-offset-2">Little Exits</a>; 
                  figures update as new sales complete.
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 pt-8 border-t border-neutral-200">
          <p className="text-neutral-500 text-xs sm:text-sm px-4">
            Data from <a href="https://app.littleexits.com" className="text-blue-600 hover:text-blue-800 underline underline-offset-2" target="_blank" rel="noopener noreferrer">Little Exits</a>
          </p>
        </footer>

        {/* Success Score Modal */}
        {showScoreModal && (
          <div 
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowScoreModal(false);
              }
            }}
          >
            <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How your success score is calculated
                </h3>
                <button
                  type="button"
                  onClick={() => setShowScoreModal(false)}
                  className="text-neutral-500 hover:text-neutral-900 p-2 rounded-lg hover:bg-neutral-100"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="text-sm text-neutral-700 space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-blue-800 font-medium mb-2">Pre-revenue focus</p>
                  <p>Since your startup is pre-revenue, we evaluate potential based on traction metrics that typically lead to monetization success.</p>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-900 font-medium mb-3">Success score logic</p>
                  <p className="mb-3">The algorithm is intentionally strict. It evaluates:</p>
                  <div className="space-y-2">
                    <p><strong>Traction (30%):</strong> User base and monthly traffic</p>
                    <p><strong>Product quality (25%):</strong> Tagline and value proposition</p>
                    <p><strong>Market category (20%):</strong> Category performance and diversification</p>
                    <p><strong>Cost efficiency (15%):</strong> Monthly costs vs. traction</p>
                    <p><strong>Growth potential (10%):</strong> Opportunity and scalability</p>
                  </div>
                  <p className="mt-3">Most startups score 20–70; strong traction and a clear proposition are needed for 80+.</p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="text-emerald-900 font-medium mb-2">Benchmarks (Little Exits)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="font-medium text-neutral-900 mb-1">Market average</p>
                      <ul className="text-sm space-y-1">
                        <li>2,500+ users</li>
                        <li>8,000+ monthly visitors</li>
                        <li>Clear value proposition</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 mb-1">Premium tier (80+)</p>
                      <ul className="text-sm space-y-1">
                        <li>5,000+ users</li>
                        <li>20,000+ monthly visitors</li>
                        <li>Strong market category</li>
                        <li>Efficient cost structure</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-violet-50 p-4 rounded-lg border border-violet-200">
                  <p className="text-violet-900 font-medium mb-2">Category analysis</p>
                  <p>Based on marketplace sales from <a href="https://littleexits.com" target="_blank" rel="noopener noreferrer" className="text-violet-700 hover:text-violet-900 underline underline-offset-2">Little Exits</a>. Multipliers reflect real transaction prices and success rates. Multiple complementary categories earn a small diversification bonus.</p>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-indigo-900 font-medium mb-2">Tagline analysis</p>
                  <p>Your tagline is analyzed for positioning, clarity, and viability. One sentence keeps URLs shareable and analysis focused.</p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-red-800 font-medium mb-2">Failure penalties</p>
                  <p>The model applies penalties for fundamental issues:</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>No meaningful tagline (−20)</li>
                    <li>Almost no traction (−15)</li>
                    <li>No clear value proposition (−15)</li>
                    <li>Poor category fit (−8)</li>
                    <li>Poor unit economics (−12)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
