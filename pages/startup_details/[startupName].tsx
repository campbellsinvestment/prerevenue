import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Confetti from 'react-confetti';
import { FaCheckCircle } from 'react-icons/fa';


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
}

const StartupPreview = () => {
  const [isLoading, setLoading] = useState(false);
  const router = useRouter();
  const { startupName } = router.query;
  const [startupData, setStartupData] = useState<StartupData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSuccess, setSuccess] = useState(false);

  useEffect(() => {
    if (router.query.success === 'true') {
      setShowConfetti(true);
      setSuccess(true);
      setLoading(false);
    }
  }, [router.query]);

  if (showConfetti) {
    setTimeout(() => setShowConfetti(false), 5000); // Stop confetti after 5 seconds
  }

  useEffect(() => {
    const data = localStorage.getItem('startupData');
    if (data) {
      const parsedData = JSON.parse(data);
      
      // Directly assign categories as an array
      parsedData.categories = Array.isArray(parsedData.categories) 
        ? parsedData.categories 
        : [];
      setStartupData(parsedData as StartupData);
    }
  }, [startupName]);

  useEffect(() => {
    // Cleanup function for blob URLs
    return () => {
      if (startupData?.iconPreview) {
        URL.revokeObjectURL(startupData.iconPreview);
      }
      if (startupData?.coverImagePreview) {
        URL.revokeObjectURL(startupData.coverImagePreview);
      }
    };
  }, []);

  const handleConfirm = async () => {
    // Assuming startupData contains your startup information
    const response = await fetch('/api/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'storeStartupData', formData: startupData }),
    });
  
    if (response.ok) {
      const { startupId } = await response.json();
      // Redirect to Stripe with startupId in metadata
      redirectToStripeCheckout(startupId);
    } else {
      console.error('Failed to save startup data');
    }
  };
  
  const redirectToStripeCheckout = async (startupId: string) => {
    try {
        console.log("Entering redirectToCheckout with startupId:", startupId);
        setLoading(true); // Make sure you have a setLoading state handler if needed

        const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ startupId }), // Pass only startupId
        });

        if (!response.ok) {
            console.error('Failed response:', await response.text()); // Log response text for debugging
            throw new Error('Error creating checkout session');
        }

        const data = await response.json();
        const { checkoutUrl } = data;

        // Redirect the user to the checkout page
        window.location.href = checkoutUrl;
    } catch (error) {
        console.error('Error redirecting to checkout:', error);
        // Handle error state here if necessary
    } finally {
        setLoading(false); // Reset loading state
    }
};



  if (!startupData) {
    return <p>Loading...</p>;
  }

  // Render the categories (assuming categories are stored as an array of names)
  const categoriesList = startupData && startupData.categories && startupData.categories.length > 0
  ? startupData.categories.map((category, index) => {
      return (
        <li key={index} className="inline-block bg-blue-400 text-white rounded px-2 py-1 mr-2">{category}</li>
      );
    })
  : <li>No categories listed</li>;



  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}
      
      {/* Success Banner */}
      {isSuccess && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <FaCheckCircle className="text-2xl" />
              <span className="text-lg font-bold">🎉 Success! Your startup has been submitted and will be analyzed shortly!</span>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button 
            onClick={() => router.push('/')} 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            ← Back to Listings
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Startup Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
              {startupData.coverImagePreview && (
                <div className="relative h-64 md:h-80">
                  <img 
                    src={startupData.coverImagePreview} 
                    alt="Cover Image Preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h1 className="text-3xl md:text-4xl font-bold">{startupData.title}</h1>
                  </div>
                </div>
              )}
              
              <div className="p-8">
                <div className="flex items-start space-x-4 mb-6">
                  {startupData.iconPreview && (
                    <img 
                      src={startupData.iconPreview} 
                      alt="Icon Preview" 
                      className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">{startupData.title}</h2>
                      <span className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        Analyzing...
                      </span>
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
                  <div className="flex flex-wrap gap-3">
                    {categoriesList}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 sticky top-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">📊 Key Metrics</h3>
              
              <div className="space-y-4">
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
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-16 text-center space-y-4">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-2xl mx-auto border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">🚀 Ready to Get Your AI Score?</h3>
            <p className="text-gray-600 mb-6">
              Complete your submission and get instant AI analysis of your startup's success potential based on Little Exits data
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isLoading ? (
                <button 
                  disabled 
                  className="bg-gray-400 text-white px-8 py-4 rounded-xl font-bold cursor-not-allowed"
                >
                  🔄 Processing Payment...
                </button>
              ) : isSuccess ? (
                <button 
                  className="bg-green-500 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center space-x-2"
                >
                  <FaCheckCircle />
                  <span>✅ Complete - Analysis in Progress</span>
                </button>
              ) : (
                <button 
                  onClick={handleConfirm} 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  💳 Pay $29 & Get Score
                </button>
              )}
              
              <button 
                onClick={() => router.push('/')} 
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-4 rounded-xl font-bold transition-colors"
              >
                📝 Edit Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartupPreview;

