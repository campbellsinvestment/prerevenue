// Test script to simulate form submission and show expected results
const testFormData = {
  title: "AI Content Generator",
  tagline: "Generate high-quality blog posts with AI",
  description: "Our AI-powered platform helps content creators generate engaging blog posts, social media content, and marketing copy in minutes. Built with GPT-4 and optimized for SEO.",
  user_base: "2500",
  traffic: "15000",
  categories: ["Artificial Intelligence", "Content Marketing", "SaaS"],
  date_started: "2024-01-15",
  price: "25000",
  monthly_cost: "800",
  startup_url: "https://aicontentgen.com"
};

// Simulate the valuation calculation
function simulateValuation(formData) {
  // These would come from the Little Exits API analysis
  const valuationMetrics = {
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

  const userBase = parseInt(formData.user_base);
  const monthlyTraffic = parseInt(formData.traffic);
  const monthlyCost = parseInt(formData.monthly_cost);
  
  // Estimate MRR based on user base (conservative estimate for pre-revenue)
  const estimatedMRR = Math.max(userBase * 0.05, 0);
  
  let estimatedValue = 0;
  let valuationMethods = 0;

  // Method 1: Revenue-based valuation
  if (estimatedMRR > 0) {
    const annualRevenue = estimatedMRR * 12;
    const revenueValue = annualRevenue * valuationMetrics.avgRevenueMultiple;
    estimatedValue += revenueValue;
    valuationMethods++;
    console.log(`Revenue valuation: $${Math.round(revenueValue)} (MRR: $${estimatedMRR}, Annual: $${annualRevenue})`);
  }

  // Method 2: Traffic-based valuation
  if (monthlyTraffic > 0) {
    const trafficValue = monthlyTraffic * valuationMetrics.avgTrafficValue;
    estimatedValue += trafficValue;
    valuationMethods++;
    console.log(`Traffic valuation: $${Math.round(trafficValue)} (${monthlyTraffic} visitors × $${valuationMetrics.avgTrafficValue})`);
  }

  // Method 3: Community-based valuation
  if (userBase > 0) {
    const communityValue = userBase * valuationMetrics.avgCommunityValue;
    estimatedValue += communityValue;
    valuationMethods++;
    console.log(`Community valuation: $${Math.round(communityValue)} (${userBase} users × $${valuationMetrics.avgCommunityValue})`);
  }

  // Average the different valuation methods
  if (valuationMethods > 0) {
    estimatedValue = estimatedValue / valuationMethods;
  }

  // Apply category multiplier
  const categoryMultiplier = formData.categories
    .map(cat => valuationMetrics.categoryMultipliers[cat] || 1)
    .reduce((a, b) => a + b, 0) / formData.categories.length;
  
  estimatedValue = estimatedValue * categoryMultiplier;

  console.log(`Category multiplier: ${categoryMultiplier.toFixed(2)} (${formData.categories.join(', ')})`);
  console.log(`Final estimated value: $${Math.round(estimatedValue)}`);
  
  return {
    estimatedValue: Math.round(estimatedValue),
    valuationRange: {
      low: Math.round(estimatedValue * 0.7),
      high: Math.round(estimatedValue * 1.3)
    },
    breakdown: {
      revenueValue: estimatedMRR > 0 ? Math.round(estimatedMRR * 12 * valuationMetrics.avgRevenueMultiple) : 0,
      trafficValue: Math.round(monthlyTraffic * valuationMetrics.avgTrafficValue),
      communityValue: Math.round(userBase * valuationMetrics.avgCommunityValue),
      categoryMultiplier
    }
  };
}

// Simulate AI success score
function simulateSuccessScore(formData) {
  // This would come from OpenAI API based on the enhanced prompt
  let score = 50; // Base score
  
  // Scoring factors based on Little Exits data
  const userBase = parseInt(formData.user_base);
  const monthlyTraffic = parseInt(formData.traffic);
  const monthlyCost = parseInt(formData.monthly_cost);
  
  // User traction scoring
  if (userBase > 5000) score += 15;
  else if (userBase > 1000) score += 10;
  else if (userBase > 100) score += 5;
  
  // Traffic scoring
  if (monthlyTraffic > 50000) score += 15;
  else if (monthlyTraffic > 10000) score += 10;
  else if (monthlyTraffic > 1000) score += 5;
  
  // Category scoring (AI is hot)
  if (formData.categories.includes("Artificial Intelligence")) score += 10;
  if (formData.categories.includes("SaaS")) score += 8;
  
  // Description quality (length and keywords)
  if (formData.description.length > 100) score += 5;
  if (formData.description.toLowerCase().includes("ai") || 
      formData.description.toLowerCase().includes("gpt")) score += 5;
  
  // Cost efficiency
  const userCostRatio = userBase / monthlyCost;
  if (userCostRatio > 5) score += 8;
  else if (userCostRatio > 2) score += 4;
  
  return Math.min(100, Math.max(0, score));
}

console.log("=== PRE-REVENUE STARTUP ANALYSIS ===");
console.log("Startup:", testFormData.title);
console.log("Categories:", testFormData.categories.join(", "));
console.log("Users:", testFormData.user_base);
console.log("Traffic:", testFormData.traffic);
console.log("Monthly Cost:", testFormData.monthly_cost);
console.log("\n=== VALUATION ANALYSIS ===");

const valuation = simulateValuation(testFormData);
const successScore = simulateSuccessScore(testFormData);

console.log("\n=== FINAL RESULTS ===");
console.log(`🎯 AI Success Score: ${successScore}/100`);
console.log(`💰 Estimated Valuation: $${valuation.estimatedValue.toLocaleString()}`);
console.log(`📊 Valuation Range: $${valuation.valuationRange.low.toLocaleString()} - $${valuation.valuationRange.high.toLocaleString()}`);

console.log("\n=== BREAKDOWN ===");
console.log(`Revenue Component: $${valuation.breakdown.revenueValue.toLocaleString()}`);
console.log(`Traffic Component: $${valuation.breakdown.trafficValue.toLocaleString()}`);
console.log(`Community Component: $${valuation.breakdown.communityValue.toLocaleString()}`);
console.log(`Category Multiplier: ${valuation.breakdown.categoryMultiplier.toFixed(2)}x`);
