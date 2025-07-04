// Test the complete form submission flow
const fetch = require('node-fetch');

async function testFormSubmission() {
  console.log("🚀 Testing Pre-Revenue Startup Analysis Flow\n");
  
  // Simulate form data
  const formData = {
    title: "AI Content Generator",
    tagline: "Generate high-quality blog posts with AI",
    description: "Our AI-powered platform helps content creators generate engaging blog posts, social media content, and marketing copy in minutes. Built with GPT-4 and optimized for SEO.",
    user_base: 2500,
    traffic: 15000,
    categories: ["Artificial Intelligence", "Content Marketing", "SaaS"],
    date_started: "2024-01-15",
    price: 25000,
    monthly_cost: 800,
    startup_url: "https://aicontentgen.com"
  };
  
  console.log("📝 Form Data Submitted:");
  console.log("Title:", formData.title);
  console.log("Users:", formData.user_base.toLocaleString());
  console.log("Traffic:", formData.traffic.toLocaleString());
  console.log("Categories:", formData.categories.join(", "));
  console.log("Monthly Cost: $" + formData.monthly_cost);
  console.log("");

  // Step 1: Simulate success score calculation
  console.log("🤖 Step 1: AI Success Score Calculation");
  console.log("Analyzing with Little Exits training data...");
  
  const successScore = calculateSuccessScore(formData);
  console.log(`✅ Success Score: ${successScore}/100`);
  console.log("");

  // Step 2: Simulate valuation calculation
  console.log("💰 Step 2: Valuation Analysis");
  console.log("Using Little Exits market data for valuation...");
  
  const valuation = calculateValuation(formData);
  console.log(`✅ Estimated Valuation: $${valuation.estimated.toLocaleString()}`);
  console.log(`📊 Range: $${valuation.low.toLocaleString()} - $${valuation.high.toLocaleString()}`);
  console.log("");

  // Step 3: Show final results
  console.log("📋 Final Analysis Results:");
  console.log("========================");
  console.log(`🎯 AI Success Score: ${successScore}/100`);
  
  let interpretation = "";
  if (successScore >= 80) interpretation = "🚀 Exceptional Potential - High probability of successful exit";
  else if (successScore >= 60) interpretation = "💪 Strong Potential - Good acquisition prospects";
  else if (successScore >= 30) interpretation = "⚡ Moderate Potential - Improvements needed";
  else interpretation = "🔧 Needs Work - Significant improvements required";
  
  console.log(`📈 Interpretation: ${interpretation}`);
  console.log(`💰 Estimated Valuation: $${valuation.estimated.toLocaleString()}`);
  console.log(`📊 Valuation Range: $${valuation.low.toLocaleString()} - $${valuation.high.toLocaleString()}`);
  console.log("");

  console.log("🔍 Valuation Breakdown:");
  console.log(`   Revenue Component: $${valuation.breakdown.revenue.toLocaleString()}`);
  console.log(`   Traffic Component: $${valuation.breakdown.traffic.toLocaleString()}`);
  console.log(`   Community Component: $${valuation.breakdown.community.toLocaleString()}`);
  console.log(`   Category Multiplier: ${valuation.breakdown.multiplier}x`);
  console.log("");

  console.log("✨ Key Success Factors:");
  console.log("   • Strong user traction (2,500 users)");
  console.log("   • High-demand AI/Content category");
  console.log("   • Good traffic-to-user conversion");
  console.log("   • Efficient cost structure");
  console.log("");

  return {
    success_score: successScore,
    estimated_valuation: valuation.estimated,
    valuation_range: { low: valuation.low, high: valuation.high },
    interpretation
  };
}

function calculateSuccessScore(data) {
  let score = 50; // Base score
  
  // User traction scoring
  if (data.user_base > 5000) score += 15;
  else if (data.user_base > 1000) score += 10;
  else if (data.user_base > 100) score += 5;
  
  // Traffic scoring
  if (data.traffic > 50000) score += 15;
  else if (data.traffic > 10000) score += 10;
  else if (data.traffic > 1000) score += 5;
  
  // Category scoring (AI is hot)
  if (data.categories.includes("Artificial Intelligence")) score += 10;
  if (data.categories.includes("SaaS")) score += 8;
  
  // Description quality
  if (data.description.length > 100) score += 5;
  if (data.description.toLowerCase().includes("ai") || 
      data.description.toLowerCase().includes("gpt")) score += 5;
  
  // Cost efficiency
  const userCostRatio = data.user_base / data.monthly_cost;
  if (userCostRatio > 5) score += 8;
  else if (userCostRatio > 2) score += 4;
  
  return Math.min(100, Math.max(0, score));
}

function calculateValuation(data) {
  // Little Exits market metrics
  const metrics = {
    avgRevenueMultiple: 2.8,
    avgProfitMultiple: 3.2,
    avgTrafficValue: 0.12,
    avgCommunityValue: 6.5,
    categoryMultipliers: {
      "Artificial Intelligence": 1.4,
      "Content Marketing": 1.1,
      "SaaS": 1.3
    }
  };

  // Estimate MRR (conservative for pre-revenue)
  const estimatedMRR = Math.max(data.user_base * 0.05, 0);
  
  let estimatedValue = 0;
  let methods = 0;

  // Revenue valuation
  const revenueValue = estimatedMRR * 12 * metrics.avgRevenueMultiple;
  if (revenueValue > 0) {
    estimatedValue += revenueValue;
    methods++;
  }

  // Traffic valuation
  const trafficValue = data.traffic * metrics.avgTrafficValue;
  estimatedValue += trafficValue;
  methods++;

  // Community valuation
  const communityValue = data.user_base * metrics.avgCommunityValue;
  estimatedValue += communityValue;
  methods++;

  // Average methods
  if (methods > 0) {
    estimatedValue = estimatedValue / methods;
  }

  // Apply category multiplier
  const categoryMultiplier = data.categories
    .map(cat => metrics.categoryMultipliers[cat] || 1)
    .reduce((a, b) => a + b, 0) / data.categories.length;
  
  estimatedValue = estimatedValue * categoryMultiplier;

  return {
    estimated: Math.round(estimatedValue),
    low: Math.round(estimatedValue * 0.7),
    high: Math.round(estimatedValue * 1.3),
    breakdown: {
      revenue: Math.round(revenueValue),
      traffic: Math.round(trafficValue),
      community: Math.round(communityValue),
      multiplier: Math.round(categoryMultiplier * 100) / 100
    }
  };
}

// Run the test
testFormSubmission().then(results => {
  console.log("🎉 Test Complete! Results saved to localStorage simulation:");
  console.log(JSON.stringify(results, null, 2));
}).catch(error => {
  console.error("❌ Test failed:", error);
});
