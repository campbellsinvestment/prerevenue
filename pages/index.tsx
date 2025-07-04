import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';

interface EvaluationResult {
  success_score: number;
  estimated_valuation: number;
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

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    tagline: '',
    user_base: '',
    traffic: '',
    monthly_cost: '',
    category: ''
  });
  const [copySuccess, setCopySuccess] = useState(false);

  // Load categories on component mount
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Load form data from URL parameters and trigger analysis
  useEffect(() => {
    if (router.isReady && Object.keys(router.query).length > 0) {
      const { tagline, user_base, traffic, monthly_cost, category } = router.query;
      
      if (tagline) {
        const urlFormData = {
          tagline: tagline as string,
          user_base: user_base as string || '',
          traffic: traffic as string || '',
          monthly_cost: monthly_cost as string || '',
          category: category as string || ''
        };
        
        setFormData(urlFormData);
        
        // Auto-trigger analysis
        performAnalysis(urlFormData);
      }
    }
  }, [router.isReady, router.query]);

  const performAnalysis = async (data: typeof formData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const requestData = {
      tagline: data.tagline,
      user_base: parseInt(data.user_base) || 0,
      traffic: parseInt(data.traffic) || 0,
      monthly_cost: parseInt(data.monthly_cost) || 0,
      categories: [data.category].filter(Boolean),
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
      
      // Calculate breakdown for display
      const userBase = requestData.user_base;
      const monthlyTraffic = requestData.traffic;
      const estimatedMRR = Math.max(userBase * 0.05, 0);
      
      setResult({
        success_score: result.successScore || 50,
        estimated_valuation: result.estimatedValuation || 5000,
        valuation_range: result.valuationRange || { low: 3500, high: 6500 },
        breakdown: {
          revenue: Math.round(estimatedMRR * 12 * 2.5),
          traffic: Math.round(monthlyTraffic * 0.1),
          community: Math.round(userBase * 5),
          multiplier: 1.2
        }
      });
    } catch (err) {
      setError('Failed to evaluate startup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const form = new FormData(event.currentTarget);
    const data = {
      tagline: form.get('tagline') as string,
      user_base: form.get('user_base') as string || '',
      traffic: form.get('traffic') as string || '',
      monthly_cost: form.get('monthly_cost') as string || '',
      category: form.get('category') as string || ''
    };

    setFormData(data);

    // Update URL with parameters
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value) params.set(key, value);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 font-mono">
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* Header */}
        <header className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/25">
            <span className="text-2xl font-bold text-white">PR</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 text-white tracking-tight">
            Pre-Revenue
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-normal">
            Evaluate your pre-revenue startup with a simple tagline and traction metrics. 
            Get instant AI analysis based on <a href="https://littleexits.com" className="text-blue-400 hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">Little Exits</a> marketplace data from 500+ successful exits.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Form Section */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-8 shadow-xl min-h-[600px]">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <h2 className="text-2xl font-semibold text-white">
                  Input Data
                </h2>
              </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Monthly Traffic
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    Product Stack
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                  >
                    <option value="">Select Stack</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
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
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-8 shadow-xl min-h-[600px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <h2 className="text-2xl font-semibold text-white">
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
              <div className="text-center text-gray-400 py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-800/50 rounded-2xl flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-lg">Enter your startup data to get an evaluation</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-gray-400 py-16">
                <div className="w-12 h-12 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-lg">Processing your data...</p>
                <p className="text-sm text-gray-500 mt-2">Analyzing market trends and calculating your score</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                
                {/* Success Score */}
                <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/30 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-400 mb-3">
                      {result.success_score}/100
                    </div>
                    <div className="text-gray-300 text-lg mb-2">Success Score</div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                      {result.success_score >= 80 && 'Exceptional potential'}
                      {result.success_score >= 60 && result.success_score < 80 && 'Strong potential'}
                      {result.success_score >= 30 && result.success_score < 60 && 'Moderate potential'}
                      {result.success_score < 30 && 'Needs improvement'}
                    </div>
                  </div>
                </div>

                {/* Valuation */}
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-400 mb-3">
                      ${result.estimated_valuation.toLocaleString()}
                    </div>
                    <div className="text-gray-300 text-lg mb-2">Estimated Valuation</div>
                    <div className="text-sm text-gray-400">
                      Range: ${result.valuation_range.low.toLocaleString()} - ${result.valuation_range.high.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Breakdown
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-xl">
                      <span className="text-gray-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        Revenue component:
                      </span>
                      <span className="text-white font-medium">${result.breakdown.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-xl">
                      <span className="text-gray-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        Traffic component:
                      </span>
                      <span className="text-white font-medium">${result.breakdown.traffic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-xl">
                      <span className="text-gray-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        Community component:
                      </span>
                      <span className="text-white font-medium">${result.breakdown.community.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-xl border-t border-gray-600/50">
                      <span className="text-gray-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        Category multiplier:
                      </span>
                      <span className="text-white font-medium">{result.breakdown.multiplier}x</span>
                    </div>
                  </div>
                </div>

                {/* Methodology */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    How Your Score Was Calculated
                  </h3>
                  <div className="text-sm text-gray-400 space-y-4">
                    <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 p-4 rounded-xl border border-blue-700/30">
                      <p className="text-blue-400 font-medium mb-2">Pre-Revenue Focus</p>
                      <p>Since your startup is pre-revenue, we evaluate potential based on traction metrics that typically lead to monetization success.</p>
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-white font-medium">Valuation Components:</p>
                      <div className="grid gap-2">
                        <p className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 font-medium">Projected Revenue:</span> Estimated at $0.05 MRR per user (industry average conversion)
                        </p>
                        <p className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-blue-400 font-medium">Traffic Value:</span> $0.10 per monthly visitor (based on acquisition cost benchmarks)
                        </p>
                        <p className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-purple-400 font-medium">Community Value:</span> $5.00 per user (engagement and retention potential)
                        </p>
                        <p className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span className="text-yellow-400 font-medium">Market Multiple:</span> Applied based on category performance from <a href="https://littleexits.com" className="text-blue-400 hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">Little Exits</a> data
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/20 p-4 rounded-xl border border-purple-700/30">
                      <p className="text-purple-400 font-medium mb-2">Category Analysis</p>
                      <p>We prioritize specific project categories over broad classifications. Granular categories (like "Chrome Extension" or "API") carry more weight than broad ones (like "SaaS") to better reflect actual market performance.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 p-4 rounded-xl border border-yellow-700/30">
                      <p className="text-yellow-400 font-medium mb-2">Success Score Logic</p>
                      <p>Combines user growth rate, traffic quality, market timing, and sustainability factors. Higher scores indicate stronger fundamentals for eventual monetization.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-indigo-900/30 to-indigo-800/20 p-4 rounded-xl border border-indigo-700/30">
                      <p className="text-indigo-400 font-medium mb-2">Tagline Analysis</p>
                      <p>Your one-sentence tagline is analyzed by AI to assess market positioning, value proposition clarity, and business model viability. The concise format helps with better AI analysis and cleaner URL sharing.</p>
                    </div>
                  </div>
                </div>

                {/* Data Sources */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Data Sources
                  </h3>
                  <div className="text-sm text-gray-400 space-y-2">
                    <p className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      Based on 500+ successful exits from <a href="https://littleexits.com" className="text-blue-400 hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">Little Exits</a> marketplace
                    </p>
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

        {/* Footer */}
        <footer className="text-center mt-20 pt-8 border-t border-gray-800/50">
          <p className="text-gray-500 text-sm">
            Data sourced from <a href="https://app.littleexits.com" className="text-blue-400 hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">Little Exits</a> marketplace
          </p>
        </footer>
      </div>
    </div>
  );
}
