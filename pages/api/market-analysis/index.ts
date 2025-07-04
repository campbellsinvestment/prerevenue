// pages/api/market-analysis/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

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
  topPerformers: {
    mainCategories: Array<{ name: string; successRate: number; avgPrice: number; projects: number }>;
    specificCategories: Array<{ name: string; successRate: number; avgPrice: number; projects: number }>;
    keywords: Array<{ word: string; frequency: number; avgPrice: number }>;
  };
}

interface LittleExitsProject {
  _id: string;
  title: string;
  description: string;
  price: number;
  categories?: string[];
  listing_main_category?: string;
  category?: string;
  metrics?: {
    users?: number;
    traffic?: number;
    revenue?: number;
  };
  sold?: boolean;
  sold_date?: string;
}

const MARKET_DATA_PATH = path.join(process.cwd(), 'data', 'market-analysis.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return current market data (PUBLIC - only aggregated data)
    try {
      const marketData = loadMarketData();
      // Only return safe, aggregated data - NO raw Little Exits data
      const safeData = {
        lastUpdated: marketData.lastUpdated,
        categoryMultipliers: marketData.categoryMultipliers,
        avgRevenueMultiple: marketData.avgRevenueMultiple,
        avgProfitMultiple: marketData.avgProfitMultiple,
        avgTrafficValue: marketData.avgTrafficValue,
        avgCommunityValue: marketData.avgCommunityValue,
        // Remove detailed project counts and specific data
      };
      res.status(200).json(safeData);
    } catch (error) {
      console.error('Error loading market data:', error);
      res.status(500).json({ error: 'Failed to load market data' });
    }
  } else if (req.method === 'POST') {
    // PROTECTED: Only allow updates from authenticated sources (cron jobs)
    const authHeader = req.headers.authorization;
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'missing-secret'}`;
    
    if (authHeader !== expectedAuth) {
      console.error('Unauthorized market analysis attempt:', { 
        provided: authHeader?.substring(0, 20) + '...', 
        expected: expectedAuth.substring(0, 20) + '...' 
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('Starting scheduled market analysis update...');
    
    // Update market data by analyzing Little Exits
    try {
      const marketData = await analyzeMarketData();
      saveMarketData(marketData);
      
      console.log('Market analysis completed:', {
        totalProjects: marketData.totalProjects,
        soldProjects: marketData.soldProjects,
        categoriesAnalyzed: Object.keys(marketData.categoryMultipliers).length,
        lastUpdated: marketData.lastUpdated
      });
      
      res.status(200).json({ 
        message: 'Market data updated successfully',
        summary: {
          totalProjects: marketData.totalProjects,
          soldProjects: marketData.soldProjects,
          categoriesAnalyzed: Object.keys(marketData.categoryMultipliers).length,
          lastUpdated: marketData.lastUpdated
        }
      });
    } catch (error) {
      console.error('Error updating market data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to update market data', details: errorMessage });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}

function loadMarketData(): MarketData {
  try {
    if (fs.existsSync(MARKET_DATA_PATH)) {
      const data = fs.readFileSync(MARKET_DATA_PATH, 'utf8');
      return JSON.parse(data);
    } else {
      // Return default data if file doesn't exist
      return getDefaultMarketData();
    }
  } catch (error) {
    console.error('Error loading market data file:', error);
    return getDefaultMarketData();
  }
}

function saveMarketData(data: MarketData): void {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(MARKET_DATA_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(MARKET_DATA_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving market data:', error);
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
      avgSoldPrice: 4800,
      avgUserBase: 2500,
      avgTraffic: 8000
    },
    topPerformers: {
      mainCategories: [
        { name: 'SaaS', successRate: 0.68, avgPrice: 8500, projects: 42 },
        { name: 'AI', successRate: 0.71, avgPrice: 7200, projects: 28 },
        { name: 'Developer Tools', successRate: 0.64, avgPrice: 6800, projects: 35 },
        { name: 'E-commerce', successRate: 0.52, avgPrice: 4500, projects: 67 }
      ],
      specificCategories: [
        { name: 'Newsletter Tool', successRate: 0.78, avgPrice: 3200, projects: 12 },
        { name: 'Chrome Extension', successRate: 0.72, avgPrice: 2800, projects: 18 },
        { name: 'API Service', successRate: 0.69, avgPrice: 5500, projects: 15 },
        { name: 'Automation Script', successRate: 0.65, avgPrice: 2100, projects: 21 }
      ],
      keywords: [
        { word: 'analytics', frequency: 67, avgPrice: 4800 },
        { word: 'automation', frequency: 89, avgPrice: 3600 },
        { word: 'dashboard', frequency: 54, avgPrice: 4200 },
        { word: 'integration', frequency: 43, avgPrice: 5100 },
        { word: 'productivity', frequency: 76, avgPrice: 3400 }
      ]
    }
  };
}

async function analyzeMarketData(): Promise<MarketData> {
  try {
    // Fetch all projects from Little Exits
    const allProjects = await fetchLittleExitsProjects({ sold: null, limit: 1000 });
    const soldProjects = allProjects.filter(p => p.sold);
    
    // Analyze category performance
    const categoryAnalysis = analyzeCategoryPerformance(allProjects, soldProjects);
    
    // Calculate market metrics
    const marketMetrics = calculateMarketMetrics(soldProjects);
    
    // Identify success patterns
    const successPatterns = identifySuccessPatterns(soldProjects);
    
    // Analyze top performers (categories and keywords)
    const topPerformers = analyzeTopPerformers(allProjects, soldProjects);
    
    return {
      lastUpdated: new Date().toISOString(),
      totalProjects: allProjects.length,
      soldProjects: soldProjects.length,
      categoryMultipliers: categoryAnalysis,
      ...marketMetrics,
      successPatterns,
      topPerformers
    };
  } catch (error) {
    console.error('Error analyzing market data:', error);
    throw error;
  }
}

async function fetchLittleExitsProjects(filters: {
  sold?: boolean | null;
  limit?: number;
  category?: string;
}): Promise<LittleExitsProject[]> {
  const { sold = null, limit = 100, category = null } = filters;
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('api_token', process.env.TA_TOKEN!);
    params.append('limit', limit.toString());
    
    if (sold !== null) params.append('sold', sold.toString());
    if (category) params.append('category', category);

    const apiUrl = `${process.env.TA_API_BASE}/tinyprojects?${params.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pre-Revenue-AI/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Little Exits projects:', error);
    return [];
  }
}

function analyzeCategoryPerformance(
  allProjects: LittleExitsProject[], 
  soldProjects: LittleExitsProject[]
): { [category: string]: number } {
  const categoryStats: { [category: string]: { total: number; sold: number; avgPrice: number; weight: number } } = {};
  
  // Helper function to add category with weight
  const addCategory = (category: string, weight: number) => {
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, sold: 0, avgPrice: 0, weight: 0 };
    }
    categoryStats[category].total += weight;
    categoryStats[category].weight += weight;
  };
  
  // Count projects by category with different weights
  allProjects.forEach(project => {
    // Primary weight goes to specific category (more granular)
    if (project.category && project.category.trim()) {
      addCategory(project.category.trim(), 1.0);
    }
    
    // Legacy categories array (if it exists)
    if (project.categories && project.categories.length > 0) {
      project.categories.forEach(category => {
        if (category && category.trim()) {
          addCategory(category.trim(), 0.8);
        }
      });
    }
    
    // Lower weight for listing main category (broad classification)
    if (project.listing_main_category && project.listing_main_category.trim()) {
      addCategory(project.listing_main_category.trim(), 0.3);
    }
  });
  
  // Count sold projects and calculate average prices with weights
  soldProjects.forEach(project => {
    const updateSoldStats = (category: string, weight: number) => {
      if (categoryStats[category]) {
        categoryStats[category].sold += weight;
        categoryStats[category].avgPrice += (project.price || 0) * weight;
      }
    };
    
    // Primary weight to specific category
    if (project.category && project.category.trim()) {
      updateSoldStats(project.category.trim(), 1.0);
    }
    
    // Legacy categories array
    if (project.categories && project.categories.length > 0) {
      project.categories.forEach(category => {
        if (category && category.trim()) {
          updateSoldStats(category.trim(), 0.8);
        }
      });
    }
    
    // Lower weight for broad listing main category
    if (project.listing_main_category && project.listing_main_category.trim()) {
      updateSoldStats(project.listing_main_category.trim(), 0.3);
    }
  });
  
  // Calculate multipliers based on weighted success rate and average price
  const multipliers: { [category: string]: number } = {};
  
  Object.entries(categoryStats).forEach(([category, stats]) => {
    if (stats.weight >= 3) { // Only consider categories with enough weighted data
      const successRate = stats.sold / stats.total;
      const avgPrice = stats.avgPrice / Math.max(stats.sold, 1);
      
      // Base multiplier on success rate (higher weight for specific categories)
      let multiplier = 0.8 + (successRate * 0.8); // Range: 0.8 to 1.6
      
      // Boost for categories with higher specificity (not just broad listing categories)
      const specificityBonus = Math.min(stats.weight / stats.total, 1.0) * 0.2;
      multiplier += specificityBonus;
      
      // Adjust based on average selling price
      if (avgPrice > 20000) multiplier += 0.2;
      else if (avgPrice > 10000) multiplier += 0.1;
      else if (avgPrice < 5000) multiplier -= 0.1;
      
      // Ensure reasonable bounds
      multiplier = Math.max(0.6, Math.min(2.0, multiplier));
      
      multipliers[category] = Math.round(multiplier * 10) / 10; // Round to 1 decimal
    }
  });
  
  return multipliers;
}

function calculateMarketMetrics(soldProjects: LittleExitsProject[]): {
  avgRevenueMultiple: number;
  avgProfitMultiple: number;
  avgTrafficValue: number;
  avgCommunityValue: number;
} {
  if (soldProjects.length === 0) {
    return {
      avgRevenueMultiple: 2.5,
      avgProfitMultiple: 3.0,
      avgTrafficValue: 0.1,
      avgCommunityValue: 5
    };
  }
  
  // Calculate traffic value (price per monthly visitor)
  const projectsWithTraffic = soldProjects.filter(p => p.metrics?.traffic && p.metrics.traffic > 0);
  const avgTrafficValue = projectsWithTraffic.length > 0 
    ? projectsWithTraffic.reduce((sum, p) => sum + (p.price / p.metrics!.traffic!), 0) / projectsWithTraffic.length
    : 0.1;
  
  // Calculate community value (price per user)
  const projectsWithUsers = soldProjects.filter(p => p.metrics?.users && p.metrics.users > 0);
  const avgCommunityValue = projectsWithUsers.length > 0
    ? projectsWithUsers.reduce((sum, p) => sum + (p.price / p.metrics!.users!), 0) / projectsWithUsers.length
    : 5;
  
  return {
    avgRevenueMultiple: 2.5, // This would need revenue data to calculate accurately
    avgProfitMultiple: 3.0,  // This would need profit data to calculate accurately
    avgTrafficValue: Math.round(avgTrafficValue * 100) / 100,
    avgCommunityValue: Math.round(avgCommunityValue * 100) / 100
  };
}

function identifySuccessPatterns(soldProjects: LittleExitsProject[]): {
  topCategories: string[];
  avgSoldPrice: number;
  avgUserBase: number;
  avgTraffic: number;
} {
  if (soldProjects.length === 0) {
    return {
      topCategories: ['SaaS', 'AI', 'E-commerce'],
      avgSoldPrice: 15000,
      avgUserBase: 2500,
      avgTraffic: 8000
    };
  }
  
  // Count category frequency in sold projects with weights
  const categoryCounts: { [category: string]: number } = {};
  
  soldProjects.forEach(project => {
    // Primary weight to specific category
    if (project.category && project.category.trim()) {
      const cat = project.category.trim();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1.0;
    }
    
    // Legacy categories array
    if (project.categories && project.categories.length > 0) {
      project.categories.forEach(category => {
        if (category && category.trim()) {
          categoryCounts[category.trim()] = (categoryCounts[category.trim()] || 0) + 0.8;
        }
      });
    }
    
    // Lower weight for broad listing main category
    if (project.listing_main_category && project.listing_main_category.trim()) {
      const cat = project.listing_main_category.trim();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 0.3;
    }
  });
  
  // Get top categories based on weighted counts
  const topCategories = Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([category]) => category);
  
  // Calculate averages
  const avgSoldPrice = soldProjects.reduce((sum, p) => sum + (p.price || 0), 0) / soldProjects.length;
  
  const projectsWithUsers = soldProjects.filter(p => p.metrics?.users);
  const avgUserBase = projectsWithUsers.length > 0
    ? projectsWithUsers.reduce((sum, p) => sum + (p.metrics!.users! || 0), 0) / projectsWithUsers.length
    : 2500;
  
  const projectsWithTraffic = soldProjects.filter(p => p.metrics?.traffic);
  const avgTraffic = projectsWithTraffic.length > 0
    ? projectsWithTraffic.reduce((sum, p) => sum + (p.metrics!.traffic! || 0), 0) / projectsWithTraffic.length
    : 8000;
  
  return {
    topCategories,
    avgSoldPrice: Math.round(avgSoldPrice),
    avgUserBase: Math.round(avgUserBase),
    avgTraffic: Math.round(avgTraffic)
  };
}

function analyzeTopPerformers(
  allProjects: LittleExitsProject[], 
  soldProjects: LittleExitsProject[]
): {
  mainCategories: Array<{ name: string; successRate: number; avgPrice: number; projects: number }>;
  specificCategories: Array<{ name: string; successRate: number; avgPrice: number; projects: number }>;
  keywords: Array<{ word: string; frequency: number; avgPrice: number }>;
} {
  const categoryStats: { [category: string]: { total: number; sold: number; totalPrice: number; isMainCategory: boolean } } = {};
  
  // Define what we consider "main" categories (broad classifications)
  const mainCategoryTerms = ['SaaS', 'AI', 'E-commerce', 'Marketplace', 'Social', 'Analytics', 'Productivity', 'Communication', 'Education', 'Gaming', 'Health', 'Finance'];
  
  // Analyze all categories
  allProjects.forEach(project => {
    const categories = [
      project.category,
      project.listing_main_category,
      ...(project.categories || [])
    ].filter((cat): cat is string => Boolean(cat && cat.trim()));
    
    categories.forEach(category => {
      const cat = category.trim();
      if (!categoryStats[cat]) {
        const isMain = mainCategoryTerms.some(term => cat.toLowerCase().includes(term.toLowerCase()));
        categoryStats[cat] = { total: 0, sold: 0, totalPrice: 0, isMainCategory: isMain };
      }
      categoryStats[cat].total++;
    });
  });
  
  // Add sold project data
  soldProjects.forEach(project => {
    const categories = [
      project.category,
      project.listing_main_category,
      ...(project.categories || [])
    ].filter((cat): cat is string => Boolean(cat && cat.trim()));
    
    categories.forEach(category => {
      const cat = category.trim();
      if (categoryStats[cat]) {
        categoryStats[cat].sold++;
        categoryStats[cat].totalPrice += project.price || 0;
      }
    });
  });
  
  // Filter and sort categories
  const processCategories = (isMain: boolean) => 
    Object.entries(categoryStats)
      .filter(([_, stats]) => stats.isMainCategory === isMain && stats.total >= 3)
      .map(([name, stats]) => ({
        name,
        successRate: Math.round((stats.sold / stats.total) * 100) / 100,
        avgPrice: Math.round(stats.totalPrice / Math.max(stats.sold, 1)),
        projects: stats.total
      }))
      .sort((a, b) => (b.successRate * b.avgPrice) - (a.successRate * a.avgPrice))
      .slice(0, 5);
  
  // Analyze keywords from titles and descriptions
  const keywordCounts: { [word: string]: { count: number; totalPrice: number; soldCount: number } } = {};
  
  soldProjects.forEach(project => {
    const text = `${project.title} ${project.description}`.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    
    words.forEach(word => {
      if (!keywordCounts[word]) {
        keywordCounts[word] = { count: 0, totalPrice: 0, soldCount: 0 };
      }
      keywordCounts[word].count++;
      keywordCounts[word].totalPrice += project.price || 0;
      keywordCounts[word].soldCount++;
    });
  });
  
  const topKeywords = Object.entries(keywordCounts)
    .filter(([_, stats]) => stats.count >= 5) // Minimum frequency
    .map(([word, stats]) => ({
      word,
      frequency: stats.count,
      avgPrice: Math.round(stats.totalPrice / stats.soldCount)
    }))
    .sort((a, b) => (b.frequency * b.avgPrice) - (a.frequency * a.avgPrice))
    .slice(0, 10);
  
  return {
    mainCategories: processCategories(true),
    specificCategories: processCategories(false),
    keywords: topKeywords
  };
}
