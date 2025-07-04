// pages/startup/[startupId].jsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// Define the type for startup data
interface StartupData {
    title: string;
    cover_image_url: string;
    tagline: string;
    description: string;
    categories: string[];
    date_started: string;
    startup_url: string;
    price: number;
    user_base: number;
    traffic: number;
    monthly_cost: number;
    seller_url: string;
    iconPreview?: string;
    coverImagePreview?: string;
    success_score?: number;
    estimated_valuation?: number;
    valuation_range?: {
      low: number;
      high: number;
    };
  }

  const StartupDetails = () => {
    const router = useRouter();
    const { startupId } = router.query;
    const [startupData, setStartupData] = useState<StartupData | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const fetchStartupData = async () => {
        if (typeof startupId === 'string') {
          try {
            const response = await fetch('/api/supabase', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                method: 'fetchStartupDetails',
                startupId,
              }),
            });
  
            if (!response.ok) {
              throw new Error('Failed to fetch startup data');
            }
  
            const data = await response.json();
            setStartupData(data);
          } catch (error) {
            console.error('Error fetching startup data:', error);
          } finally {
            setLoading(false);
          }
        }
      };
  
      fetchStartupData();
    }, [startupId]);
  
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-xl text-gray-600">Loading startup details...</p>
          </div>
        </div>
      );
    }

    if (!startupData) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600">Startup not found</p>
            <button 
              onClick={() => router.push('/')} 
              className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    const categoriesList = startupData.categories?.map((category, index) => (
      <span 
        key={index} 
        className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-medium mr-2 mb-2"
      >
        {category}
      </span>
    )) || <span className="text-gray-500">No categories listed</span>;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button 
              onClick={() => router.push('/')} 
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              ← Back to Listings
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero Section */}
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {startupData.cover_image_url && (
                  <div className="relative h-64 md:h-80">
                    <img 
                      src={startupData.cover_image_url} 
                      alt="Cover Image" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <h1 className="text-3xl md:text-4xl font-bold">{startupData.title}</h1>
                      {startupData.success_score && (
                        <div className="mt-2">
                          <span className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-full text-lg font-bold">
                            Success Score: {startupData.success_score}/100
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="p-8">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">{startupData.title}</h2>
                      </div>
                      <a 
                        href={startupData.startup_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                      >
                        🌐 {startupData.startup_url}
                      </a>
                    </div>
                  </div>

                  <div className="prose prose-gray max-w-none">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">✨ Tagline</h3>
                    <p className="text-lg text-gray-700 italic bg-gray-50 p-4 rounded-xl">
                      "{startupData.tagline}"
                    </p>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3 mt-8">📝 Description</h3>
                    <div className="text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-xl">
                      {startupData.description}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">🏷️ Categories</h3>
                    <div className="flex flex-wrap">
                      {categoriesList}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 sticky top-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">📊 Key Metrics</h3>
                
                <div className="space-y-4">
                  {/* Success Score - Premium Feature */}
                  {startupData.success_score && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
                      <div className="text-sm text-gray-600 font-medium mb-2">🎯 AI Success Score</div>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {startupData.success_score}/100
                      </div>
                      <div className="text-xs text-green-700">
                        Based on 500+ Little Exits data points
                      </div>
                    </div>
                  )}

                  {/* Estimated Valuation - Premium Feature */}
                  {startupData.estimated_valuation && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                      <div className="text-sm text-gray-600 font-medium mb-2">💎 Estimated Valuation</div>
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        ${Number(startupData.estimated_valuation).toLocaleString()}
                      </div>
                      {startupData.valuation_range && (
                        <div className="text-xs text-purple-700">
                          Range: ${Number(startupData.valuation_range.low).toLocaleString()} - ${Number(startupData.valuation_range.high).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 font-medium">💰 Asking Price</div>
                    <div className="text-2xl font-bold text-indigo-600">
                      ${Number(startupData.price).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 font-medium">👥 User Base</div>
                    <div className="text-2xl font-bold text-green-600">
                      {Number(startupData.user_base).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 font-medium">📈 Monthly Traffic</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Number(startupData.traffic).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 font-medium">💳 Monthly Costs</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ${Number(startupData.monthly_cost).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
                    <div className="text-sm text-gray-600 font-medium">📅 Started</div>
                    <div className="text-lg font-bold text-purple-600">
                      {new Date(startupData.date_started).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>

                {/* Contact Seller */}
                <a 
                  href={startupData.seller_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="block w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-center py-4 px-6 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  💬 Contact Seller
                </a>

                {/* Submit Your Own */}
                <button
                  onClick={() => {
                    document.getElementById('submit-section')?.scrollIntoView({ behavior: 'smooth' });
                    router.push('/#submit-section');
                  }}
                  className="block w-full mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-center py-4 px-6 rounded-xl font-bold transition-all duration-200"
                >
                  🚀 Submit Your Startup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      );
    };

export default StartupDetails;
