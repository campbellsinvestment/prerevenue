// pages/api/successscore/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

interface ValuationMetrics {
  avgRevenueMultiple: number;
  avgProfitMultiple: number;
  avgTrafficValue: number;
  avgCommunityValue: number;
  categoryMultipliers: { [category: string]: number };
}

interface MarketData {
  lastUpdated: string;
  totalProjects: number;
  soldProjects: number;
  categoryMultipliers: { [category: string]: number };
  avgRevenueMultiple: number;
  avgProfitMultiple: number;
  avgTrafficValue: number;
  avgCommunityValue: number;
  successPatterns: {
    topCategories: string[];
    avgSoldPrice: number;
    avgUserBase: number;
    avgTraffic: number;
  };
}

function loadMarketData(): MarketData {
  try {
    const marketDataPath = path.join(process.cwd(), 'data', 'market-analysis.json');
    if (fs.existsSync(marketDataPath)) {
      const data = fs.readFileSync(marketDataPath, 'utf8');
      return JSON.parse(data);
    } else {
      // Return default data if analysis hasn't run yet
      return getDefaultMarketData();
    }
  } catch (error) {
    console.error('Error loading market data:', error);
    return getDefaultMarketData();
  }
}

function getDefaultMarketData(): MarketData {
  return {
    lastUpdated: new Date().toISOString(),
    totalProjects: 0,
    soldProjects: 0,
    categoryMultipliers: {
      'AI': 1.8,                    // Hot market, high demand
      'SaaS': 1.6,                  // Strong market performance
      'Automation': 1.5,            // High value, efficiency focused
      'API': 1.4,                   // Developer tools, good demand
      'E-commerce': 1.3,            // Established market
      'Chrome Extension': 1.3,      // Niche but valuable
      'Webflow': 1.2,               // Design/development tools
      'Mobile App': 1.1,            // Competitive but viable
      'Marketplace': 1.0,           // Average performance
      'Newsletter': 0.9,            // Declining market interest
      'Web3': 0.8,                  // Volatile, uncertain market
      'Community': 0.7,             // Hard to monetize
      'Blog': 0.6,                  // Difficult market, low multiples
      'Social Media': 0.5,          // Very competitive, low success
    },
    avgRevenueMultiple: 2.5,
    avgProfitMultiple: 3.0,
    avgTrafficValue: 0.1,
    avgCommunityValue: 5,
    successPatterns: {
      topCategories: ['AI', 'SaaS', 'Automation'],
      avgSoldPrice: 15000,
      avgUserBase: 2500,
      avgTraffic: 8000
    }
  };
}

function getCategoryMultiplier(category: string, marketData: MarketData): number {
  if (!category) return 1.0;
  
  const categoryLower = category.toLowerCase().trim();
  
  // Direct match first
  if (marketData.categoryMultipliers[category]) {
    return marketData.categoryMultipliers[category];
  }
  
  // Fuzzy matching for common variations
  const categoryMappings: { [key: string]: string[] } = {
    'SaaS': ['saas', 'software', 'software-as-a-service', 'b2b software', 'web app'],
    'AI': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'gpt', 'llm'],
    'E-commerce': ['ecommerce', 'e-commerce', 'online store', 'marketplace', 'retail'],
    'API': ['api', 'rest api', 'graphql', 'webhook', 'integration'],
    'Chrome Extension': ['chrome extension', 'browser extension', 'extension'],
    'Mobile App': ['mobile app', 'ios app', 'android app', 'react native', 'flutter'],
    'Newsletter': ['newsletter', 'email list', 'email marketing', 'substack'],
    'Web3': ['web3', 'crypto', 'blockchain', 'nft', 'defi', 'dao'],
    'Community': ['community', 'forum', 'discord', 'social network'],
    'Blog': ['blog', 'content site', 'news site', 'publication'],
    'Automation': ['automation', 'workflow', 'zapier', 'no-code']
  };
  
  // Find best match
  for (const [mainCategory, variations] of Object.entries(categoryMappings)) {
    if (variations.some(variation => categoryLower.includes(variation) || variation.includes(categoryLower))) {
      return marketData.categoryMultipliers[mainCategory] || 1.0;
    }
  }
  
  // Default multiplier if no match found
  return 1.0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const formData = req.body;
    
    // Get success score from AI
    const successScore = await getSuccessScoreFromChatGPT(formData);
    
    // Get estimated valuation using our Little Exits data
    const valuationResult = await getEstimatedValuation(formData);

    res.status(200).json({ 
      successScore,
      estimatedValuation: valuationResult.valuation,
      isMaxValuation: valuationResult.isMaxValuation,
      valuationRange: {
        low: Math.round(valuationResult.valuation * 0.7),
        high: Math.round(valuationResult.valuation * 1.3)
      }
    });
  } catch (error) {
    console.error('Error calculating success score:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getEstimatedValuation(formData: any): Promise<{valuation: number, isMaxValuation: boolean}> {
  try {
    // Load current market data
    const marketData = loadMarketData();
    
    // Extract data from form
    const userBase = parseInt(formData.user_base || '0', 10);
    const monthlyTraffic = parseInt(formData.traffic || '0', 10);
    const monthlyCost = parseInt(formData.monthly_cost || '0', 10);
    const categories = formData.categories || [];
    const tagline = formData.tagline || '';
    
    // Base valuation calculation
    let estimatedValue = 0;
    
    // 1. User base valuation (more conservative for pre-revenue)
    if (userBase > 0) {
      let userValue = 0;
      if (userBase >= 10000) userValue = userBase * 3;      // Significantly reduced for pre-revenue
      else if (userBase >= 5000) userValue = userBase * 2.5; // More realistic
      else if (userBase >= 2500) userValue = userBase * 2;   // Conservative
      else if (userBase >= 1000) userValue = userBase * 1.5; // Lower multiple
      else if (userBase >= 500) userValue = userBase * 1;    // Minimal value
      else userValue = userBase * 0.5;                       // Very conservative
      
      estimatedValue += userValue;
    }
    
    // 2. Traffic valuation (much more realistic for pre-revenue)
    if (monthlyTraffic > 0) {
      let trafficValue = 0;
      if (monthlyTraffic >= 100000) trafficValue = monthlyTraffic * 0.08;    // Reduced from 0.15
      else if (monthlyTraffic >= 50000) trafficValue = monthlyTraffic * 0.06; // Reduced from 0.12
      else if (monthlyTraffic >= 20000) trafficValue = monthlyTraffic * 0.05; // Reduced from 0.10
      else if (monthlyTraffic >= 8000) trafficValue = monthlyTraffic * 0.03;  // Reduced from 0.08
      else if (monthlyTraffic >= 3000) trafficValue = monthlyTraffic * 0.02;  // Reduced from 0.05
      else trafficValue = monthlyTraffic * 0.01;                              // Reduced from 0.02
      
      estimatedValue += trafficValue;
    }
    
    // 3. Revenue potential (much more conservative for pre-revenue)
    const estimatedMRR = Math.max(userBase * 0.01, 0); // Even lower conversion assumption
    if (estimatedMRR > 0) {
      const annualRevenue = estimatedMRR * 12;
      const revenueValue = annualRevenue * 1.2; // Much lower multiple for pre-revenue
      estimatedValue += revenueValue;
    }
    
    // 4. Apply category multiplier based on actual market performance
    let categoryMultiplier = 1.0;
    if (categories.length > 0) {
      const categoryValues = categories.map((cat: string) => getCategoryMultiplier(cat, marketData));
      categoryMultiplier = categoryValues.reduce((a: number, b: number) => a + b, 0) / categoryValues.length;
    }
    estimatedValue = estimatedValue * categoryMultiplier;
    
    // 5. Apply quality adjustments based on tagline and efficiency (less harsh)
    const qualityMultiplier = calculateBalancedQualityMultiplier(tagline, userBase, monthlyTraffic, monthlyCost);
    estimatedValue = estimatedValue * qualityMultiplier;
    
    // 6. More balanced reality checks instead of harsh penalties
    if (userBase < 10 && monthlyTraffic < 100 && (!tagline || tagline.length < 10)) {
      estimatedValue = Math.min(estimatedValue, 200); // Low but not zero valuation
    } else if (userBase < 50 && monthlyTraffic < 500) {
      estimatedValue = Math.min(estimatedValue, 1000); // Cap very low traction startups
    } else if (userBase < 200 && monthlyTraffic < 2000) {
      estimatedValue = Math.min(estimatedValue, 5000); // Cap low traction startups
    }
    
    // More balanced cost penalties
    if (monthlyCost > 1000 && userBase < 50) {
      estimatedValue = estimatedValue * 0.6; // 40% penalty instead of 70%
    } else if (monthlyCost > 500 && userBase < 25) {
      estimatedValue = estimatedValue * 0.4; // 60% penalty instead of 90%
    }
    
    // Less harsh tagline penalties
    if (!tagline || tagline.length < 5) {
      estimatedValue = estimatedValue * 0.5; // 50% penalty instead of 80%
    } else if (tagline.length < 15) {
      estimatedValue = estimatedValue * 0.7; // 30% penalty instead of 50%
    }
    
    // Check for test taglines but be less harsh
    const taglineLower = tagline.toLowerCase();
    const testIndicators = ['test', 'hello', 'asdf', '123', 'qwerty', 'sample', 'example'];
    if (testIndicators.some(word => taglineLower.includes(word))) {
      estimatedValue = Math.min(estimatedValue, 300); // Cap at $300 instead of $100
    }
    
    // More generous minimum valuation
    const hasAnyTraction = userBase >= 10 || monthlyTraffic >= 100;
    const hasValidTagline = tagline && tagline.length >= 10 && !testIndicators.some(word => taglineLower.includes(word));
    
    if (estimatedValue < 500 && hasAnyTraction && hasValidTagline) {
      estimatedValue = 500;
    } else if (estimatedValue < 200 && (hasAnyTraction || hasValidTagline)) {
      estimatedValue = 200;
    } else if (estimatedValue < 50 && (tagline || userBase > 0 || monthlyTraffic > 0)) {
      estimatedValue = 50; // Minimum for any meaningful attempt
    }

    // Realistic maximum for pre-revenue startups (more conservative)
    const maxValuation = 50000;
    const isMaxValuation = estimatedValue >= maxValuation;
    estimatedValue = Math.min(estimatedValue, maxValuation);

    return {
      valuation: Math.round(Math.max(0, estimatedValue)),
      isMaxValuation: isMaxValuation
    };
  } catch (error) {
    console.error('Error estimating valuation:', error);
    // Return a very basic estimate
    const userBase = parseInt(formData.user_base || '0', 10);
    const monthlyTraffic = parseInt(formData.traffic || '0', 10);
    const basicValuation = Math.max(userBase * 1.5 + monthlyTraffic * 0.03, 500);
    return {
      valuation: Math.round(basicValuation),
      isMaxValuation: false
    };
  }
}

function calculateBalancedQualityMultiplier(tagline: string, userBase: number, monthlyTraffic: number, monthlyCost: number): number {
  let multiplier = 1.0;
  
  // Less harsh tagline quality impact
  if (!tagline || tagline.length < 5) {
    multiplier *= 0.8; // Lighter penalty for poor/no tagline
  } else {
    const taglineLower = tagline.toLowerCase();
    
    // Bonus for strong value propositions
    const strongWords = ['ai', 'automation', 'saas', 'platform', 'api', 'tool for'];
    if (strongWords.some(word => taglineLower.includes(word))) {
      multiplier *= 1.15; // Slightly lower bonus
    }
    
    // Bonus for clear target market
    const targetWords = ['businesses', 'developers', 'teams', 'companies'];
    if (targetWords.some(word => taglineLower.includes(word))) {
      multiplier *= 1.08; // Slightly lower bonus
    }
    
    // Lighter penalty for vague taglines
    const vagueWords = ['easy', 'simple', 'fast', 'best', 'revolutionary'];
    if (vagueWords.some(word => taglineLower.includes(word))) {
      multiplier *= 0.95; // Much lighter penalty
    }
  }
  
  // More balanced efficiency multiplier
  if (monthlyCost > 0) {
    const totalTraction = userBase + (monthlyTraffic / 10);
    const efficiency = totalTraction / monthlyCost;
    
    if (efficiency > 10) multiplier *= 1.2;       // Lower bonus for very efficient
    else if (efficiency > 5) multiplier *= 1.08;  // Lower bonus for good efficiency
    else if (efficiency > 1) multiplier *= 1.0;   // Average efficiency (neutral)
    else if (efficiency > 0.2) multiplier *= 0.9; // Lighter penalty for poor efficiency
    else multiplier *= 0.7;                       // Less harsh penalty for very poor efficiency
  }
  
  // Traction quality multiplier (less harsh)
  const trafficToUserRatio = userBase > 0 ? monthlyTraffic / userBase : 0;
  if (trafficToUserRatio > 10) multiplier *= 1.15; // Lower bonus for good traffic conversion
  else if (trafficToUserRatio < 2 && userBase > 100) multiplier *= 0.95; // Lighter penalty for poor traffic generation
  
  return Math.max(0.5, Math.min(1.8, multiplier)); // Better range: 50% to 180%
}

async function getSuccessScoreFromChatGPT(formData: any) {
  const prompt = constructPrompt(formData);
  
  try {
    // Check for OpenAI API Key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn("OpenAI API key is not configured, using market-based score");
      return calculateMarketBasedScore(formData);
    }

    const payload = {
      model: "gpt-3.5-turbo-instruct",
      prompt,
      temperature: 0.3,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 500,
    };

    const gptResponse = await fetch("https://api.openai.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!gptResponse.ok) {
      throw new Error(`OpenAI API responded with status ${gptResponse.status}`);
    }

    const { choices } = await gptResponse.json();
    const score = interpretResponse(choices[0].text);
    return score;
  } catch (error) {
    console.error('Error getting AI score:', error);
    // Return a calculated score based on metrics if AI fails
    return calculateMarketBasedScore(formData);
  }
}

function constructPrompt(formData: any): string {
  const tagline = formData.tagline as string;
  const userBase = formData.user_base as string;
  const monthlyTraffic = formData.traffic as string;
  const categories = formData.categories || [];
  const monthlyCost = formData.monthly_cost as string;

  const categoriesFormatted = Array.isArray(categories) ? categories.join(', ') : categories;

  return `You are a balanced startup analyst trained on successful marketplace data. Your role is to provide realistic assessments that consider both potential and current traction.

Analyze this pre-revenue startup:

Tagline: "${tagline}"
User Base: ${userBase} users
Monthly Traffic: ${monthlyTraffic} unique visitors
Categories: ${categoriesFormatted}
Monthly Costs: $${monthlyCost}

MARKET BENCHMARKS:
- Early success indicators: 100+ users OR 1,000+ monthly traffic
- Market average: 2,500 users, 8,000 monthly traffic
- Strong performance: 5,000+ users, 20,000+ traffic
- Category multipliers: AI/SaaS (high growth), E-commerce (established), Community (relationship-based)

BALANCED EVALUATION FRAMEWORK:

1. CURRENT TRACTION (40% weight):
   - Strong traction (5,000+ users OR 20,000+ traffic): 75-90
   - Good traction (1,000+ users OR 5,000+ traffic): 60-75
   - Early traction (100+ users OR 1,000+ traffic): 45-60
   - Minimal traction (10+ users OR 100+ traffic): 30-45
   - Very early stage (some data present): 20-35
   - No meaningful data: 10-25

2. PRODUCT QUALITY & MARKET FIT (30% weight):
   - Clear value proposition with specific target market: +15-20
   - Identifiable problem/solution fit: +10-15
   - Basic concept with potential: +5-10
   - Vague or unclear positioning: +0-5

3. MARKET OPPORTUNITY (20% weight):
   - High-growth categories (AI, SaaS, Automation): +15-20
   - Stable markets (E-commerce, Tools): +10-15
   - Competitive markets: +5-10
   - Declining markets: +0-5

4. OPERATIONAL EFFICIENCY (10% weight):
   - Sustainable cost structure: +5-10
   - High costs but justified by growth: +0-5
   - Concerning cost/traction ratio: -5-0

Score Distribution Philosophy:
- 80-100: Exceptional startups with strong traction and clear market opportunity
- 60-79: Good startups showing meaningful progress and potential
- 40-59: Early-stage startups with valid concepts and some indicators
- 25-39: Very early startups with basic validation or potential
- 10-24: Startups needing significant development or pivot
- 1-9: Incomplete submissions or very preliminary concepts

Consider the full context - early-stage startups deserve credit for taking first steps and showing any meaningful progress. Balance rigor with recognition of market realities.

Return your response in this exact format: "Score: [number]"`;
}

function interpretResponse(responseText: string) {
  const scorePattern = /Score: (\d+)/;
  const match = responseText.match(scorePattern);
  return match ? parseInt(match[1], 10) : 50;
}

function calculateMarketBasedScore(formData: any): number {
  const userBase = parseInt(formData.user_base || '0', 10);
  const monthlyTraffic = parseInt(formData.traffic || '0', 10);
  const monthlyCost = parseInt(formData.monthly_cost || '0', 10);
  const categories = formData.categories || [];
  const tagline = formData.tagline || '';
  
  // Load market data for benchmarking
  const marketData = loadMarketData();
  
  // Start with more balanced scoring system (1-100 range)
  let scores = {
    traction: 0,        // 0-40 points based on user base and traffic
    product: 0,         // 0-30 points based on tagline quality and market fit
    category: 0,        // 0-20 points based on category performance
    efficiency: 0,      // 0-10 points based on cost structure
  };
  
  // 1. TRACTION SCORING (0-40 points) - Most important for exits
  // More generous scoring that recognizes early-stage progress
  const userScore = calculateBalancedTractionScore(userBase, [
    { threshold: 10000, points: 20 },   // Exceptional (top 5%)
    { threshold: 5000, points: 18 },    // Excellent (top 10%)
    { threshold: 2500, points: 16 },    // Good (market average)
    { threshold: 1000, points: 14 },    // Above early stage
    { threshold: 500, points: 12 },     // Early traction
    { threshold: 100, points: 10 },     // Meaningful start
    { threshold: 50, points: 8 },       // Basic validation
    { threshold: 10, points: 6 },       // Some progress
    { threshold: 1, points: 4 },        // Started
    { threshold: 0, points: 2 }         // Minimum base score
  ]);
  
  const trafficScore = calculateBalancedTractionScore(monthlyTraffic, [
    { threshold: 50000, points: 20 },   // Exceptional traffic
    { threshold: 20000, points: 18 },   // Excellent traffic
    { threshold: 8000, points: 16 },    // Good traffic (market average)
    { threshold: 3000, points: 14 },    // Above early stage
    { threshold: 1000, points: 12 },    // Early traction
    { threshold: 500, points: 10 },     // Meaningful start
    { threshold: 100, points: 8 },      // Basic validation
    { threshold: 50, points: 6 },       // Some progress
    { threshold: 10, points: 4 },       // Started
    { threshold: 0, points: 2 }         // Minimum base score
  ]);
  
  scores.traction = userScore + trafficScore;
  
  // 2. PRODUCT QUALITY SCORING (0-30 points) - More generous
  scores.product = evaluateBalancedProductQuality(tagline);
  
  // 3. CATEGORY PERFORMANCE SCORING (0-20 points) - Same logic but better baseline
  scores.category = evaluateBalancedCategoryPerformance(categories, marketData);
  
  // 4. EFFICIENCY SCORING (0-10 points) - Less harsh penalties
  scores.efficiency = evaluateBalancedEfficiency(userBase, monthlyTraffic, monthlyCost);
  
  // Calculate final score with balanced approach
  const baseScore = scores.traction + scores.product + scores.category + scores.efficiency;
  
  // Apply balanced adjustments instead of harsh penalties
  let finalScore = baseScore;
  
  // Minor adjustments for data quality issues (not harsh penalties)
  if (!tagline || tagline.length < 5) finalScore -= 5; // Minor penalty for no tagline
  if (userBase === 0 && monthlyTraffic === 0) finalScore -= 8; // Penalty for absolutely no traction
  
  // Check for test data but be less harsh
  const taglineLower = tagline.toLowerCase();
  const testIndicators = ['test', 'hello', 'asdf', '123', 'qwerty', 'sample', 'example'];
  if (testIndicators.some(word => taglineLower.includes(word))) {
    finalScore = Math.min(finalScore, 15); // Cap at 15 for test data, not 10
  }
  
  // Ensure minimum score of 1 for any submission with some effort
  if (tagline && tagline.length > 3) {
    finalScore = Math.max(finalScore, 5);
  } else if (userBase > 0 || monthlyTraffic > 0) {
    finalScore = Math.max(finalScore, 3);
  } else {
    finalScore = Math.max(finalScore, 1); // Always minimum 1
  }

  return Math.min(100, Math.max(1, Math.round(finalScore))); // Ensure 1-100 range
}

function calculateBalancedTractionScore(value: number, thresholds: Array<{threshold: number, points: number}>): number {
  for (const tier of thresholds) {
    if (value >= tier.threshold) {
      return tier.points;
    }
  }
  return 0;
}

function evaluateBalancedProductQuality(tagline: string): number {
  if (!tagline || tagline.length < 3) return 2; // Minimum score instead of 0
  
  // Check for test/nonsense data but be more forgiving
  const taglineLower = tagline.toLowerCase();
  const testIndicators = ['test', 'hello', 'asdf', '123', 'qwerty', 'sample', 'example'];
  if (testIndicators.some(word => taglineLower.includes(word))) {
    return 5; // Give some credit even for test data
  }
  
  let score = 8; // Better base score for having any meaningful tagline
  
  // Value proposition clarity (0-10 points)
  const valueWords = ['helps', 'enables', 'automates', 'simplifies', 'improves', 'optimizes', 'manages', 'connects', 'creates', 'builds'];
  if (valueWords.some(word => taglineLower.includes(word))) score += 5;
  
  const solutionWords = ['platform', 'tool', 'solution', 'service', 'system', 'app', 'software'];
  if (solutionWords.some(word => taglineLower.includes(word))) score += 3;
  
  const modernTechWords = ['ai', 'ml', 'automation', 'api', 'saas', 'cloud', 'dashboard'];
  if (modernTechWords.some(word => taglineLower.includes(word))) score += 3;
  
  // Target market clarity (0-6 points)
  const targetMarkets = ['businesses', 'companies', 'teams', 'developers', 'creators', 'entrepreneurs', 'professionals'];
  if (targetMarkets.some(word => taglineLower.includes(word))) score += 4;
  
  const specificMarkets = ['e-commerce', 'saas', 'startups', 'small business', 'enterprise'];
  if (specificMarkets.some(word => taglineLower.includes(word))) score += 2;
  
  // Length and structure bonuses
  if (tagline.length > 15 && tagline.length < 100) score += 3; // Good length
  if (tagline.split(' ').length >= 4) score += 2; // Sufficient detail
  
  // Minor penalties for very poor quality (reduced)
  if (tagline.split(' ').length < 3) score -= 2; // Too short
  if (tagline.length < 10) score -= 1; // Very short
  
  return Math.min(30, Math.max(2, score)); // Ensure 2-30 range
}

function evaluateBalancedCategoryPerformance(categories: string[], marketData: MarketData): number {
  if (categories.length === 0) return 8; // Better neutral score for no category
  
  const multipliers = categories.map(category => getCategoryMultiplier(category, marketData));
  
  let finalMultiplier: number;
  if (categories.length === 1) {
    finalMultiplier = multipliers[0];
  } else if (categories.length === 2) {
    finalMultiplier = (multipliers.reduce((a, b) => a + b, 0) / multipliers.length) * 1.05;
  } else {
    finalMultiplier = (multipliers.reduce((a, b) => a + b, 0) / multipliers.length) * 1.1;
  }
  
  // Convert multiplier to score (2-20 points) with better baseline
  if (finalMultiplier >= 1.6) return 20;      // Top performers (AI, SaaS)
  else if (finalMultiplier >= 1.4) return 18; // Strong performers  
  else if (finalMultiplier >= 1.2) return 16; // Above average
  else if (finalMultiplier >= 1.0) return 12; // Average (better baseline)
  else if (finalMultiplier >= 0.8) return 10; // Below average
  else if (finalMultiplier >= 0.6) return 8;  // Poor performers
  else return 6;                               // Very poor (but not 0)
}

function evaluateBalancedEfficiency(userBase: number, monthlyTraffic: number, monthlyCost: number): number {
  if (monthlyCost <= 0) return 8; // Good if no costs (better baseline)
  if (userBase <= 0 && monthlyTraffic <= 0) return 2; // Some points even with no traction
  
  const totalTraction = userBase + (monthlyTraffic / 10);
  const efficiency = totalTraction / monthlyCost;
  
  // More generous efficiency scoring
  if (efficiency > 10) return 10;       // Excellent efficiency
  else if (efficiency > 5) return 8;    // Good efficiency  
  else if (efficiency > 2) return 6;    // Average efficiency
  else if (efficiency > 0.5) return 4;  // Below average
  else if (efficiency > 0.1) return 3;  // Poor efficiency
  else return 2;                        // Very poor but not zero
}


