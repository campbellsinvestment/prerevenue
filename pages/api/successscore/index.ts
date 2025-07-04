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
      'SaaS': 1.5,
      'AI': 1.6,
      'E-commerce': 1.4,
      'Webflow': 1.4,
      'Chrome Extension': 1.3,
      'API': 1.3,
      'Automation': 1.3,
      'Marketplace': 1.2,
      'Newsletter': 1.2,
      'Web3': 1.2,
      'Community': 1.0,
      'Blog': 0.9,
    },
    avgRevenueMultiple: 2.5,
    avgProfitMultiple: 3.0,
    avgTrafficValue: 0.1,
    avgCommunityValue: 5,
    successPatterns: {
      topCategories: ['SaaS', 'AI', 'E-commerce'],
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
    const estimatedValuation = await getEstimatedValuation(formData);

    res.status(200).json({ 
      successScore,
      estimatedValuation,
      valuationRange: {
        low: Math.round(estimatedValuation * 0.7),
        high: Math.round(estimatedValuation * 1.3)
      }
    });
  } catch (error) {
    console.error('Error calculating success score:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getEstimatedValuation(formData: any): Promise<number> {
  try {
    // Load current market data
    const marketData = loadMarketData();
    
    // Use market-based valuation metrics
    const metrics: ValuationMetrics = {
      avgRevenueMultiple: marketData.avgRevenueMultiple,
      avgProfitMultiple: marketData.avgProfitMultiple,
      avgTrafficValue: marketData.avgTrafficValue,
      avgCommunityValue: marketData.avgCommunityValue,
      categoryMultipliers: marketData.categoryMultipliers
    };

    // Extract data from form
    const userBase = parseInt(formData.user_base || '0', 10);
    const monthlyTraffic = parseInt(formData.traffic || '0', 10);
    const monthlyCost = parseInt(formData.monthly_cost || '0', 10);
    const categories = formData.categories || [];
    
    // Estimate MRR based on user base (rough estimate for pre-revenue)
    const estimatedMRR = Math.max(userBase * 0.05, 0);
    
    let estimatedValue = 0;
    let valuationMethods = 0;

    // Method 1: Revenue-based valuation (estimated MRR * 12 * multiple)
    if (estimatedMRR > 0) {
      const annualRevenue = estimatedMRR * 12;
      const revenueValue = annualRevenue * metrics.avgRevenueMultiple;
      estimatedValue += revenueValue;
      valuationMethods++;
    }

    // Method 2: Traffic-based valuation
    if (monthlyTraffic > 0) {
      const trafficValue = monthlyTraffic * metrics.avgTrafficValue;
      estimatedValue += trafficValue;
      valuationMethods++;
    }

    // Method 3: Community-based valuation
    if (userBase > 0) {
      const communityValue = userBase * metrics.avgCommunityValue;
      estimatedValue += communityValue;
      valuationMethods++;
    }

    // Average the different valuation methods
    if (valuationMethods > 0) {
      estimatedValue = estimatedValue / valuationMethods;
    }

    // Apply market performance-based category multiplier
    let categoryMultiplier = 1;
    if (categories.length > 0) {
      const categoryValues = categories.map((cat: string) => getCategoryMultiplier(cat, marketData));
      categoryMultiplier = categoryValues.reduce((a: number, b: number) => a + b, 0) / categoryValues.length;
    }
    estimatedValue = estimatedValue * categoryMultiplier;

    // Minimum valuation for any project with some data
    if (estimatedValue < 1000 && (estimatedMRR > 0 || monthlyTraffic > 1000 || userBase > 100)) {
      estimatedValue = 1000;
    }

    // Cap at reasonable maximum for pre-revenue
    estimatedValue = Math.min(estimatedValue, 100000);

    return Math.round(estimatedValue);
  } catch (error) {
    console.error('Error estimating valuation:', error);
    // Return a basic estimate based on user base and traffic
    const userBase = parseInt(formData.user_base || '0', 10);
    const monthlyTraffic = parseInt(formData.traffic || '0', 10);
    return Math.max(userBase * 2 + monthlyTraffic * 0.05, 1000);
  }
}

async function getSuccessScoreFromChatGPT(formData: any) {
  const prompt = constructPrompt(formData);
  
  try {
    const gptResponse = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!gptResponse.ok) {
      throw new Error("Failed to get response from OpenAI");
    }

    const { choices } = await gptResponse.json();
    const score = interpretResponse(choices[0].text);
    return score;
  } catch (error) {
    console.error('Error getting AI score:', error);
    // Return a calculated score based on metrics if AI fails
    return calculateFallbackScore(formData);
  }
}

function constructPrompt(formData: any): string {
  const title = formData.title as string;
  const description = formData.description as string;
  const userBase = formData.user_base as string;
  const monthlyTraffic = formData.traffic as string;
  const categories = formData.categories || [];
  const monthlyCost = formData.monthly_cost as string;

  const categoriesFormatted = Array.isArray(categories) ? categories.join(', ') : categories;

  return `You are an expert startup analyst trained on 500+ successful exits from Little Exits marketplace.

Analyze this pre-revenue startup:

Title: "${title}"
Description: ${description}
User Base: ${userBase} users
Monthly Traffic: ${monthlyTraffic} unique visitors
Categories: ${categoriesFormatted}
Monthly Costs: $${monthlyCost}

Based on Little Exits data (avg revenue multiples 2.5x, traffic value $0.10/visitor, community value $5/user), evaluate:

1. Market demand and category performance
2. User traction vs growth potential
3. Revenue potential and monetization clarity
4. Technical viability
5. Cost structure efficiency
6. Description quality and business model clarity

Provide a success score from 0-100 where:
- 0-30: Low likelihood of successful exit
- 31-60: Moderate potential with improvements needed
- 61-80: Strong potential for acquisition
- 81-100: Exceptional startup with high exit probability

Return your response in this exact format: "Score: [number]"`;
}

function interpretResponse(responseText: string) {
  const scorePattern = /Score: (\d+)/;
  const match = responseText.match(scorePattern);
  return match ? parseInt(match[1], 10) : 50;
}

function calculateFallbackScore(formData: any): number {
  let score = 50; // Base score
  
  const userBase = parseInt(formData.user_base || '0', 10);
  const monthlyTraffic = parseInt(formData.traffic || '0', 10);
  const monthlyCost = parseInt(formData.monthly_cost || '0', 10);
  const categories = formData.categories || [];
  
  // Load market data for category scoring
  const marketData = loadMarketData();
  
  // User traction scoring
  if (userBase > 5000) score += 15;
  else if (userBase > 1000) score += 10;
  else if (userBase > 100) score += 5;
  
  // Traffic scoring
  if (monthlyTraffic > 50000) score += 15;
  else if (monthlyTraffic > 10000) score += 10;
  else if (monthlyTraffic > 1000) score += 5;
  
  // Market performance-based category scoring
  for (const category of categories) {
    const multiplier = getCategoryMultiplier(category, marketData);
    if (multiplier >= 1.4) score += 12; // High performers
    else if (multiplier >= 1.2) score += 8; // Strong performers
    else if (multiplier >= 1.0) score += 4; // Average performers
    // Lower performers get no bonus
  }
  
  // Description quality
  if (formData.description && formData.description.length > 100) score += 5;
  
  // Cost efficiency
  if (monthlyCost > 0) {
    const userCostRatio = userBase / monthlyCost;
    if (userCostRatio > 5) score += 8;
    else if (userCostRatio > 2) score += 4;
  }
  
  return Math.min(100, Math.max(0, score));
}


