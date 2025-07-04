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
    fetch('/api/top-performers')
      .then(res => res.json())
      .then(data => setTopPerformers(data.topPerformers))
      .catch(err => console.error('Failed to load top performers:', err));
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
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 font-mono">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        
        {/* Header */}
        <header className="text-center mb-12 sm:mb-20">
          <div className="flex items-center justify-center gap-4 mb-4 sm:mb-6">
            <Image 
              src="/Little Exits Icon Dark.png" 
              alt="Little Exits Logo" 
              width={48}
              height={48}
              className="w-12 h-12 sm:w-16 sm:h-16"
            />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Pre-Revenue
            </h1>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-normal px-4">
            Evaluate your pre-revenue startup with a simple tagline and traction metrics. 
            Get instant AI analysis based on <a href="https://littleexits.com" className="text-blue-400 hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">Little Exits</a> marketplace data from 200+ successful exits.
          </p>
          
          {/* Little Exits Branding */}
          <div className="mt-8 sm:mt-12 flex items-center justify-center gap-3 text-sm text-gray-500">
            <span>Powered by</span>
            <a 
              href="https://littleexits.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-gray-400 transition-colors"
            >
              <Image 
                src="/Little Exits Icon Dark.png" 
                alt="Little Exits" 
                width={20}
                height={20}
                className="w-5 h-5 rounded"
              />
              <span className="font-medium">Little Exits</span>
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          
          {/* Form Section */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 sm:p-8 shadow-xl min-h-[600px]">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                  Input Data
                </h2>
              </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Tagline
                  <span className="text-gray-500 text-xs ml-2">(max 128 characters)</span>
                </label>
                <input
                  type="text"
                  name="tagline"
                  required
                  maxLength={128}
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                  placeholder="AI-powered task automation for small businesses"
                />
                <div className="text-xs text-gray-500">
                  {formData.tagline.length}/128 characters
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Users
                  </label>
                  <input
                    type="number"
                    name="user_base"
                    min="0"
                    value={formData.user_base}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_base: e.target.value }))}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Monthly Unique Visitors
                  </label>
                  <input
                    type="number"
                    name="traffic"
                    min="0"
                    value={formData.traffic}
                    onChange={(e) => setFormData(prev => ({ ...prev, traffic: e.target.value }))}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Monthly Costs ($)
                  </label>
                  <input
                    type="number"
                    name="monthly_cost"
                    min="0"
                    value={formData.monthly_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_cost: e.target.value }))}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Categories
                    <span className="text-gray-500 text-xs ml-2">(select up to 3)</span>
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
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
                      <div className="text-xs text-gray-400 mb-2">
                        Selected ({formData.categories.length}/3):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.categories.map((category) => (
                          <span 
                            key={category} 
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-300 text-sm rounded-lg border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
                          >
                            <span>{category}</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ 
                                ...prev, 
                                categories: prev.categories.filter(c => c !== category) 
                              }))}
                              className="text-blue-300 hover:text-white text-lg leading-none font-medium"
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
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg shadow-blue-600/25 disabled:shadow-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                ) : (
                  'Evaluate'
                )}
              </button>
            </form>              {error && (
                <div className="mt-6 p-4 bg-red-900/50 border border-red-700/50 rounded-xl text-red-200 text-sm backdrop-blur-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 sm:p-8 shadow-xl min-h-[600px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                  Analysis Results
                </h2>
              </div>
              {result && (
                <button
                  onClick={copyAnalysisUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-xl text-gray-300 hover:text-white transition-all duration-200 text-sm"
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Share Analysis
                    </>
                  )}
                </button>
              )}
            </div>

            {!result && !isLoading && (
              <div className="text-center text-gray-400 py-12 sm:py-16">
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gray-800/50 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-base sm:text-lg">Enter your startup data to get an evaluation</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-gray-400 py-12 sm:py-16">
                <div className="w-8 h-8 sm:w-12 sm:h-12 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4 sm:mb-6"></div>
                <p className="text-base sm:text-lg">Processing your data...</p>
                <p className="text-sm text-gray-500 mt-2">Analyzing market trends and calculating your score</p>
              </div>
            )}

            {result && (
              <div className="space-y-4 sm:space-y-6">
                
                {/* Success Score */}
                <div className={`rounded-2xl p-4 sm:p-6 backdrop-blur-sm ${
                  result.success_score >= 60 
                    ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30' 
                    : result.success_score >= 40 
                    ? 'bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700/30'
                    : result.success_score >= 20
                    ? 'bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/30'
                    : 'bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/30'
                }`}>
                  <div className="text-center">
                    <div className={`text-4xl sm:text-5xl font-bold mb-2 sm:mb-3 ${
                      result.success_score >= 60 
                        ? 'text-green-400' 
                        : result.success_score >= 40 
                        ? 'text-yellow-400'
                        : result.success_score >= 20
                        ? 'text-orange-400'
                        : 'text-red-400'
                    }`}>
                      {result.success_score}/100
                    </div>
                    <div className="text-gray-300 text-base sm:text-lg mb-2 flex items-center justify-center gap-2">
                      Success Score
                      <button
                        onClick={() => setShowScoreModal(true)}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700/30"
                        title="How your score was calculated"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                      result.success_score >= 80 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : result.success_score >= 60 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : result.success_score >= 40 
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : result.success_score >= 20
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
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
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-2xl p-4 sm:p-6 backdrop-blur-sm relative overflow-hidden">
                  {result.is_max_valuation && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-500/20 to-transparent w-20 h-full pointer-events-none">
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-full px-2 py-1">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-yellow-400 text-xs font-medium">MAX</span>
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-blue-400 mb-2 sm:mb-3 flex items-center justify-center gap-2">
                      ${result.estimated_valuation.toLocaleString()}
                      {result.is_max_valuation && (
                        <div className="flex items-center gap-1">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-300 text-base sm:text-lg mb-2">
                      {result.is_max_valuation ? (
                        <div className="flex items-center justify-center gap-2">
                          <span>Estimated Valuation</span>
                          <div className="flex items-center gap-1 text-yellow-400 text-sm">
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
                    <div className="text-xs sm:text-sm text-gray-400">
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
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Valuation Calculation
                  </h3>
                  <div className="space-y-3 text-xs sm:text-sm">
                    
                    {/* Base Components */}
                    <div className="bg-gray-700/20 rounded-xl p-3 sm:p-4">
                      <div className="text-gray-300 font-medium mb-3">Base Components:</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                            User base value (tiered pricing):
                          </span>
                          <span className="text-white font-medium">${result.breakdown.community.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            Traffic value (tiered pricing):
                          </span>
                          <span className="text-white font-medium">${result.breakdown.traffic.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            Revenue potential (MRR × 12 × 1.8):
                          </span>
                          <span className="text-white font-medium">${result.breakdown.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="border-t border-gray-600/50 mt-3 pt-3">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-gray-300">Base Subtotal:</span>
                          <span className="text-white">${(result.breakdown.revenue + result.breakdown.traffic + result.breakdown.community).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Multipliers */}
                    <div className="bg-yellow-900/20 rounded-xl p-3 sm:p-4 border border-yellow-700/30">
                      <div className="text-yellow-400 font-medium mb-3">Applied Adjustments:</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            Combined multiplier:
                          </span>
                          <span className="text-yellow-300 font-medium">{result.breakdown.multiplier}x</span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>• Category performance multiplier</div>
                          {formData.categories.length > 1 && (
                            <div>• {formData.categories.length === 2 ? '+5%' : '+10%'} diversification bonus</div>
                          )}
                          <div>• Quality adjustments (tagline, efficiency)</div>
                          <div>• Reality checks and penalty applications</div>
                        </div>
                      </div>
                    </div>

                    {/* Final Calculation */}
                    <div className="bg-blue-900/20 rounded-xl p-3 sm:p-4 border border-blue-700/30">
                      <div className="flex justify-between items-center text-base font-semibold">
                        <span className="text-blue-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Final Valuation:
                        </span>
                        <span className="text-blue-300">${result.estimated_valuation.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        ${(result.breakdown.revenue + result.breakdown.traffic + result.breakdown.community).toLocaleString()} × {result.breakdown.multiplier} = ${result.estimated_valuation.toLocaleString()}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-gray-700/20 rounded-lg p-3 border border-gray-600/30">
                      <div className="text-xs text-gray-400 space-y-1">
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-gray-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span>User and traffic values use tiered pricing based on performance benchmarks</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-gray-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span>Combined multiplier includes category, quality, efficiency, and penalty adjustments</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-gray-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span>Reality checks may cap valuations for poor-performing startups</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-gray-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span>Maximum valuation cap: $100,000 for pre-revenue startups</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Sources */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Data Sources
                  </h3>
                  <div className="text-xs sm:text-sm text-gray-400 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1 flex-shrink-0"></div>
                      <div>
                        <span>Based on 200+ successful exits from </span>
                        <a href="https://littleexits.com" className="text-blue-400 hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">Little Exits</a>
                        <span> marketplace</span>
                      </div>
                    </div>
                    <p className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      Market multiples updated weekly from real transaction data
                    </p>
                    <p className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      Conversion rates derived from SaaS and startup benchmarks
                    </p>
                    <p className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      Category adjustments reflect actual market performance by sector
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Categories - Below Analysis Results */}
        {topPerformers && (
          <div className="mt-8 lg:mt-12 bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            <div className="mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 flex items-center gap-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Market Performance Data
              </h3>
              <p className="text-gray-400 text-sm">
                Real sales data from <a href="https://littleexits.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Little Exits</a> marketplace. 
                Average sale prices shown are based on actual completed transactions.
              </p>
            </div>
            
            <div className="space-y-8">
              {/* Main Categories */}
              <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/30 p-6 sm:p-8 rounded-xl border border-blue-700/40 w-full">
                <h4 className="text-blue-400 font-semibold mb-6 text-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Main Categories
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {topPerformers.mainCategories.slice(0, 4).map((cat, idx) => (
                    <div key={idx} className="bg-blue-900/40 rounded-xl border border-blue-800/50 p-4 sm:p-6 hover:bg-blue-900/50 transition-all duration-200 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-200 font-semibold text-sm sm:text-base break-words pr-2">{cat.name}</span>
                        <div className="text-blue-300 font-bold text-xl sm:text-2xl flex-shrink-0">{Math.round(cat.successRate * 100)}%</div>
                      </div>
                      <div className="text-center text-xs sm:text-sm text-gray-400 mb-3">
                        {cat.projects} sold • ${(cat.avgPrice / 1000).toFixed(0)}k avg
                      </div>
                      <div className="mt-auto">
                        <div className="bg-blue-900/30 rounded-full h-2">
                          <div 
                            className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round(cat.successRate * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Specific Categories */}
              <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/30 p-6 sm:p-8 rounded-xl border border-emerald-700/40 w-full">
                <h4 className="text-emerald-400 font-semibold mb-6 text-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Specific Categories
                </h4>
                <div className="w-full flex justify-center">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl">
                    {topPerformers.specificCategories.slice(0, 4).map((cat, idx) => (
                      <div key={idx} className="bg-emerald-900/40 rounded-xl border border-emerald-800/50 p-6 hover:bg-emerald-900/50 transition-all duration-200 h-full flex flex-col min-w-0">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-gray-200 font-semibold text-sm break-words pr-2">{cat.name}</span>
                          <div className="text-emerald-300 font-bold text-2xl flex-shrink-0">{Math.round(cat.successRate * 100)}%</div>
                        </div>
                        <div className="text-center text-sm text-gray-400 mb-3">
                          {cat.projects} sold • ${(cat.avgPrice / 1000).toFixed(0)}k avg
                        </div>
                        <div className="mt-auto">
                          <div className="bg-emerald-900/30 rounded-full h-2">
                            <div 
                              className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.round(cat.successRate * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Top Keywords */}
              <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/30 p-6 sm:p-8 rounded-xl border border-amber-700/40 w-full">
                <h4 className="text-amber-400 font-semibold mb-6 text-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  High-Value Keywords
                </h4>
                <div className="w-full flex justify-center">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-6xl">
                    {topPerformers.keywords.slice(0, 5).map((keyword, idx) => (
                      <div key={idx} className="bg-amber-900/40 rounded-xl border border-amber-800/50 p-6 hover:bg-amber-900/50 transition-all duration-200 h-full flex flex-col min-w-0">
                        <div className="text-center flex-1 flex flex-col justify-center">
                          <div className="text-gray-200 font-semibold text-sm mb-2 break-words">&quot;{keyword.word}&quot;</div>
                          <div className="text-amber-300 font-bold text-2xl mb-2">{keyword.frequency}×</div>
                          <div className="text-sm text-gray-400 mt-auto">
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
            
            <div className="mt-8 p-4 bg-gray-900/50 rounded-xl border border-gray-700/30">
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Real-time data from <a href="https://littleexits.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Little Exits</a> marketplace. 
                Success rates and prices update automatically as new sales occur.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 sm:mt-20 pt-6 sm:pt-8 border-t border-gray-800/50">
          <p className="text-gray-500 text-xs sm:text-sm px-4">
            Data sourced from <a href="https://app.littleexits.com" className="text-blue-400 hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">Little Exits</a> marketplace
          </p>
        </footer>

        {/* Success Score Modal */}
        {showScoreModal && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowScoreModal(false);
              }
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 sm:p-8 max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-semibold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How Your Success Score Was Calculated
                </h3>
                <button
                  onClick={() => setShowScoreModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800/50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="text-sm text-gray-300 space-y-4">
                <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 p-4 rounded-xl border border-blue-700/30">
                  <p className="text-blue-400 font-medium mb-2">Pre-Revenue Focus</p>
                  <p>Since your startup is pre-revenue, we evaluate potential based on traction metrics that typically lead to monetization success.</p>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 p-4 rounded-xl border border-yellow-700/30">
                  <p className="text-yellow-400 font-medium mb-3">Rigorous Success Score Logic</p>
                  <p className="mb-3">Our algorithm is intentionally harsh and realistic. It evaluates:</p>
                  <div className="space-y-2 ml-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span><strong>Traction (30%):</strong> User base and monthly traffic metrics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span><strong>Product Quality (25%):</strong> Tagline clarity and value proposition</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span><strong>Market Category (20%):</strong> Category performance and diversification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span><strong>Cost Efficiency (15%):</strong> Monthly costs vs. traction metrics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      <span><strong>Growth Potential (10%):</strong> Market opportunity and scalability</span>
                    </div>
                  </div>
                  <p className="mt-3">Most startups score 20-70, with only exceptional startups with strong traction and clear value propositions scoring 80+.</p>
                </div>

                <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 p-4 rounded-xl border border-green-700/30">
                  <p className="text-green-400 font-medium mb-2">Benchmarks from Little Exits Data</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="font-medium text-white mb-1">Market Average Performance:</p>
                      <ul className="text-sm space-y-1">
                        <li>• 2,500+ users</li>
                        <li>• 8,000+ monthly visitors</li>
                        <li>• Clear value proposition</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">Premium Tier (80+ score):</p>
                      <ul className="text-sm space-y-1">
                        <li>• 5,000+ users</li>
                        <li>• 20,000+ monthly visitors</li>
                        <li>• Strong market category</li>
                        <li>• Efficient cost structure</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/20 p-4 rounded-xl border border-purple-700/30">
                  <p className="text-purple-400 font-medium mb-2">Category Analysis</p>
                  <p>Based on real marketplace sales data from <a href="https://littleexits.com" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">Little Exits</a>. Category multipliers reflect actual sale prices and success rates from completed transactions. Selecting multiple complementary categories can provide a small diversification bonus.</p>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-900/30 to-indigo-800/20 p-4 rounded-xl border border-indigo-700/30">
                  <p className="text-indigo-400 font-medium mb-2">Tagline Analysis</p>
                  <p>Your one-sentence tagline is analyzed by AI to assess market positioning, value proposition clarity, and business model viability. The concise format helps with better AI analysis and cleaner URL sharing.</p>
                </div>

                <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 p-4 rounded-xl border border-red-700/30">
                  <p className="text-red-400 font-medium mb-2">Critical Failure Penalties</p>
                  <p>The algorithm applies harsh penalties for fundamental issues:</p>
                  <ul className="mt-2 space-y-1 text-sm ml-4">
                    <li>• No meaningful tagline (-20 points)</li>
                    <li>• Almost no traction (-15 points)</li>
                    <li>• No clear value proposition (-15 points)</li>
                    <li>• Poor market category fit (-8 points)</li>
                    <li>• Terrible unit economics (-12 points)</li>
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
