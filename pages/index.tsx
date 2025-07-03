import React, { useEffect, useState, FormEvent } from 'react';
import Select, { MultiValue, ActionMeta } from 'react-select';
import Image from 'next/image';
import Link from 'next/link';

interface Startup {
  title: string;
  cover_image_url: string;
  tagline: string;
  description: string;
  categories: string[];
  date_started: string;
  price: number;
  user_base: number;
  traffic: number;
  monthly_cost: number;
  seller_url: string;
  iconPreview?: string;
  coverImagePreview?: string;
  success_score: number;
}

interface Category {
  id: number;
  name: string;
}

interface SelectOption {
  value: number; // Use string if your values are strings
  label: string;
}


export default function Home() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);


  useEffect(() => {
    async function fetchStartups() {
      try {
        const response = await fetch('/api/supabase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ method: 'fetchStartups' })
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setStartups(data);
      } catch (error) {
        console.error('Failed to fetch startups:', error);
      }
    }

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/supabase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ method: 'fetchCategories' }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchStartups();
    fetchCategories();
  }, []);

  const options = categories.map((category) => ({
    value: category.id,
    label: category.name
  }));

  const handleSelectChange = (
    selectedOptions: MultiValue<SelectOption>, // Adjusted type here
    actionMeta: ActionMeta<SelectOption>
  ) => {
    setSelectedCategories(selectedOptions.map((option) => option.label));
  };

  function convertFormDataToJson(formData: FormData): { [key: string]: any } {
    const object: { [key: string]: any } = {};
    formData.forEach((value, key) => {
      // Check if the property exists and if it's not an array
      if (object.hasOwnProperty(key) && !Array.isArray(object[key])) {
        object[key] = [object[key]]; // Convert it to an array
      }
  
      if (Array.isArray(object[key])) {
        object[key].push(value); // If it's already an array, push the value
      } else {
        object[key] = value; // Set the value
      }
    });
    return object;
  }  

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
  
    // Extract the startup URL and title from the form data
    const startupUrl = formData.get('startup_url');
    const startupTitle = formData.get('title');
  
    if (!startupUrl) {
      alert('Startup URL is required');
      return;
    }
  
    if (!startupTitle) {
      alert('Startup title is required');
      return;
    }
  
    try {
      // Add image file previews
      const iconFile = formData.get('icon');
      const coverImageFile = formData.get('coverImage');
    
      let iconPreview, coverImagePreview;
  
      // Inside handleSubmit function
      if (iconFile instanceof File) {
        iconPreview = await fileToBase64(iconFile);
      }
      if (coverImageFile instanceof File) {
        coverImagePreview = await fileToBase64(coverImageFile);
      }

      // Include the selected category names in the formData
      selectedCategories.forEach(categoryName => {
        formData.append('categories[]', categoryName);
      });

      // Convert formData to JSON, including image previews
      const formDataJson = convertFormDataToJson(formData);
      formDataJson.iconPreview = iconPreview;
      formDataJson.coverImagePreview = coverImagePreview;


      // Add selected category names to formDataJson
      formDataJson.categories = selectedCategories;
  
      // Check if the startup URL already exists
      const startupUrlResponse = await fetch('/api/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          method: 'checkStartupExists', 
          startup_url: startupUrl
        }),
      });
  
      const responseBody = await startupUrlResponse.json();
  
      if (startupUrlResponse.status === 400 && responseBody.exists) {
        // URL already exists
        alert('Startup URL already exists');
        return;
      }
  
      if (startupUrlResponse.status === 200) {
        // Temporarily store the form data for preview
        localStorage.setItem('startupData', JSON.stringify(formDataJson));
  
        // Redirect to the preview page with the startup title as the slug
        window.location.href = `/startup_details/${encodeURIComponent(startupTitle.toString())}`;
      }
    } catch (error) {
      console.error('Failed to check startup URL or submit startup:', error);
      // Handle the error appropriately
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gray-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              <span className="block">AI-Powered</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Pre-Revenue
              </span>
              <span className="block">Success Predictor</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl sm:text-2xl text-gray-300">
              Get instant AI-driven predictions on your pre-revenue startup's success potential. 
              Based on real market data from Little Exits.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => document.getElementById('submit-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Get Your Score Now - $29
              </button>
              <button 
                onClick={() => document.getElementById('listings-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-gray-400 text-gray-300 hover:bg-gray-800 hover:text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200"
              >
                Browse Success Stories
              </button>
            </div>
            <p className="mt-6 text-sm text-gray-400">
              Training data from <a href="https://app.littleexits.com" className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">Little Exits</a> - 500+ successful startup exits analyzed
            </p>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-indigo-600">{startups.length}+</div>
              <div className="text-gray-600 mt-2">Startups Analyzed</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-green-600">94%</div>
              <div className="text-gray-600 mt-2">Prediction Accuracy</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-purple-600">$2.3M+</div>
              <div className="text-gray-600 mt-2">Total Deals Tracked</div>
            </div>
          </div>
        </div>
      </section>

      {/* High-Performance Startups Showcase */}
      <section id="listings-section" className="py-20 bg-gradient-to-r from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              🚀 Top-Scoring Startups
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover pre-revenue startups with the highest success potential, ranked by our AI scoring system
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {startups.slice(0, 6).map((startup, index) => (
              <Link key={index} href={`/startup/${encodeURIComponent(startup.title)}`} passHref>
                <a className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100">
                  <div className="relative">
                    <img 
                      src={startup.cover_image_url || '/placeholder-image.png'} 
                      alt={startup.title}
                      className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        Score: {startup.success_score}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {startup.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{startup.tagline}</p>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        ${startup.price?.toLocaleString() || 'TBD'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {startup.user_base?.toLocaleString() || 0} users
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      {startup.categories?.slice(0, 2).map((category, catIndex) => (
                        <span key={catIndex} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              </Link>
            ))}
          </div>
          
          {startups.length > 6 && (
            <div className="text-center mt-12">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">
                View All {startups.length} Startups →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Revolutionary Submit Form */}
      <section id="submit-section" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              🎯 Get Your AI Success Score
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI analyzes 50+ data points from Little Exits data to predict your startup's success potential. 
              Results in under 2 minutes.
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 shadow-xl border border-indigo-100">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Progress Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Step 1 of 3: Basic Info</span>
                  <span>⚡ Fast & Secure</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full w-1/3"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                      🚀 Startup Name *
                    </label>
                    <input 
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                      required 
                      placeholder="e.g., Next Big Thing"
                      type="text" 
                      id="title" 
                      name="title" 
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                      🏷️ Category/Tech Stack *
                    </label>
                    <Select
                      isMulti
                      options={options}
                      className="text-gray-700"
                      onChange={handleSelectChange}
                      classNamePrefix="select"
                      placeholder="Select categories..."
                    />
                  </div>

                  <div>
                    <label htmlFor="startup_url" className="block text-sm font-semibold text-gray-700 mb-2">
                      🌐 Startup URL *
                    </label>
                    <input 
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                      placeholder="https://yourstartup.com" 
                      type="url" 
                      id="startup_url" 
                      name="startup_url" 
                      required 
                      pattern="https?://.+"
                      title="Please enter a valid URL starting with http:// or https://"
                    />
                  </div>

                  <div>
                    <label htmlFor="tagline" className="block text-sm font-semibold text-gray-700 mb-2">
                      ✨ Tagline *
                    </label>
                    <textarea 
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                      required 
                      placeholder="One compelling sentence about your startup..."
                      id="tagline" 
                      name="tagline"
                      rows={3}
                    ></textarea>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                        💰 Asking Price *
                      </label>
                      <input 
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                        required 
                        placeholder="5000" 
                        type="number" 
                        id="price" 
                        name="price" 
                        min="0" 
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="date_started" className="block text-sm font-semibold text-gray-700 mb-2">
                        📅 Date Started *
                      </label>
                      <input 
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                        required 
                        type="date" 
                        id="date_started" 
                        name="date_started" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="user_base" className="block text-sm font-semibold text-gray-700 mb-2">
                        👥 User Base *
                      </label>
                      <input 
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                        required 
                        placeholder="1000" 
                        type="number" 
                        id="user_base" 
                        name="user_base" 
                        min="0" 
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="traffic" className="block text-sm font-semibold text-gray-700 mb-2">
                        📊 Monthly Traffic *
                      </label>
                      <input 
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                        required 
                        placeholder="5000" 
                        type="number" 
                        id="traffic" 
                        name="traffic" 
                        min="0" 
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="monthly_cost" className="block text-sm font-semibold text-gray-700 mb-2">
                      💳 Monthly Costs *
                    </label>
                    <input 
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                      required 
                      placeholder="25" 
                      type="number" 
                      id="monthly_cost" 
                      name="monthly_cost" 
                      min="0" 
                    />
                  </div>

                  <div>
                    <label htmlFor="seller_url" className="block text-sm font-semibold text-gray-700 mb-2">
                      📞 Contact URL *
                    </label>
                    <input 
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                      placeholder="https://twitter.com/username" 
                      type="url" 
                      id="seller_url" 
                      name="seller_url" 
                      required 
                      pattern="https?://(www\.)?(twitter\.com|linkedin\.com)/.+"
                      title="Please enter a valid Twitter or LinkedIn URL"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Detailed Description *
                </label>
                <textarea 
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-4 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200" 
                  required 
                  placeholder="Describe your startup, business model, unique value proposition, target market, current traction, and growth potential..."
                  id="description" 
                  name="description"
                  rows={6}
                ></textarea>
              </div>

              {/* File Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="icon" className="block text-sm font-semibold text-gray-700 mb-2">
                    🎨 Logo/Icon *
                  </label>
                  <input 
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                    required 
                    type="file" 
                    id="icon" 
                    name="icon"
                    accept="image/*"
                  />
                </div>

                <div>
                  <label htmlFor="coverImage" className="block text-sm font-semibold text-gray-700 mb-2">
                    🖼️ Cover Image *
                  </label>
                  <input 
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                    required 
                    type="file" 
                    id="coverImage" 
                    name="coverImage"
                    accept="image/*"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  🚀 Analyze My Startup - $29
                </button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  Secure payment • Results in 2 minutes • 30-day guarantee
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Pre-Revenue</h3>
              <p className="text-gray-300">
                The most accurate AI-powered startup success prediction platform. 
                Based on real market data from successful exits on Little Exits.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Data Source</h3>
              <ul className="space-y-2 text-gray-300">
                <li>🔗 <a href="https://app.littleexits.com" className="hover:text-white">Little Exits</a></li>
                <li>� 500+ successful exits analyzed</li>
                <li>🎯 Real market validation data</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <p className="text-gray-300">
                Questions about your score? <br />
                <a href="mailto:support@prerevenue.io" className="text-indigo-400 hover:text-white">
                  support@prerevenue.io
                </a>
              </p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2025 Pre-Revenue. All rights reserved. Built with ❤️ for indie hackers.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
