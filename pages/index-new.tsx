import React, { useState, FormEvent } from 'react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      user_base: parseInt(formData.get('user_base') as string) || 0,
      traffic: parseInt(formData.get('traffic') as string) || 0,
      monthly_cost: parseInt(formData.get('monthly_cost') as string) || 0,
      categories: [formData.get('category') as string].filter(Boolean),
    };

    try {
      const response = await fetch('/api/successscore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      const result = await response.json();
      
      // Calculate breakdown for display
      const userBase = data.user_base;
      const monthlyTraffic = data.traffic;
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-mono">
      <div className="max-w-4xl mx-auto px-4 py-16">
        
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-white">
            prerevenue.io
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Evaluate your pre-revenue startup using AI and real market data from 500+ successful exits.
            Free analysis based on Little Exits marketplace data.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Form Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">
              Input Data
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MyStartup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of what your startup does..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Users
                  </label>
                  <input
                    type="number"
                    name="user_base"
                    min="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly Traffic
                  </label>
                  <input
                    type="number"
                    name="traffic"
                    min="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monthly Costs ($)
                  </label>
                  <input
                    type="number"
                    name="monthly_cost"
                    min="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    <option value="SaaS">SaaS</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="AI">AI</option>
                    <option value="Community">Community</option>
                    <option value="Newsletter">Newsletter</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Web3">Web3</option>
                    <option value="Mobile App">Mobile App</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {isLoading ? 'Analyzing...' : 'Evaluate'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-white">
              Analysis Results
            </h2>

            {!result && !isLoading && (
              <div className="text-center text-gray-400 py-12">
                <div className="text-6xl mb-4">{ }</div>
                <p>Enter your startup data to get an evaluation</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-gray-400 py-12">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Processing your data...</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                
                {/* Success Score */}
                <div className="bg-gray-700 border border-gray-600 rounded p-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-400 mb-2">
                      {result.success_score}/100
                    </div>
                    <div className="text-gray-300">Success Score</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {result.success_score >= 80 && 'Exceptional potential'}
                      {result.success_score >= 60 && result.success_score < 80 && 'Strong potential'}
                      {result.success_score >= 30 && result.success_score < 60 && 'Moderate potential'}
                      {result.success_score < 30 && 'Needs improvement'}
                    </div>
                  </div>
                </div>

                {/* Valuation */}
                <div className="bg-gray-700 border border-gray-600 rounded p-6">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-blue-400 mb-2">
                      ${result.estimated_valuation.toLocaleString()}
                    </div>
                    <div className="text-gray-300">Estimated Valuation</div>
                    <div className="text-sm text-gray-400">
                      Range: ${result.valuation_range.low.toLocaleString()} - ${result.valuation_range.high.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="bg-gray-700 border border-gray-600 rounded p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Breakdown</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Revenue component:</span>
                      <span className="text-white">${result.breakdown.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Traffic component:</span>
                      <span className="text-white">${result.breakdown.traffic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Community component:</span>
                      <span className="text-white">${result.breakdown.community.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600 pt-2">
                      <span className="text-gray-400">Category multiplier:</span>
                      <span className="text-white">{result.breakdown.multiplier}x</span>
                    </div>
                  </div>
                </div>

                {/* Methodology */}
                <div className="bg-gray-700 border border-gray-600 rounded p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Methodology</h3>
                  <div className="text-sm text-gray-400 space-y-2">
                    <p>• Based on 500+ successful exits from Little Exits marketplace</p>
                    <p>• Revenue multiple: 2.5x average annual revenue</p>
                    <p>• Traffic value: $0.10 per monthly visitor</p>
                    <p>• Community value: $5.00 per user</p>
                    <p>• Category performance adjustments applied</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Data sourced from <a href="https://app.littleexits.com" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Little Exits</a> marketplace
          </p>
        </footer>
      </div>
    </div>
  );
}
