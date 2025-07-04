// pages/api/analyze-success-patterns.ts
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface Project {
  Name?: string;
  'Price (high)'?: number;
  'Price (low)'?: number;
  Category?: string;
  Sold?: string | boolean;
  Active?: string | boolean;
  'Net Profit'?: number;
  MRR?: number;
  'Community Size'?: number;
  'Monthly Expense'?: number;
  'Created Date'?: string;
  Description?: string;
  'Traffic (Unique Visitors/Month)'?: number;
  'Asking Price'?: number;
  [key: string]: any;
}

interface ValuationMetrics {
  avgRevenueMultiple: number;
  avgProfitMultiple: number;
  avgTrafficValue: number;
  avgCommunityValue: number;
  categoryMultipliers: { [category: string]: number };
}

interface CategoryMapping {
  [id: string]: string;
}

// Function to load category mappings from JSON file
function loadCategoryMappings(): CategoryMapping {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'categories.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const mapping = JSON.parse(jsonContent);
    
    console.log(`Loaded ${Object.keys(mapping).length} category mappings from JSON`);
    return mapping;
  } catch (error) {
    console.error('Error loading category mappings from JSON:', error);
    return {};
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const baseUrl = process.env.TA_API_BASE;
  const token = process.env.TA_TOKEN;

  if (!baseUrl || !token) {
    return res.status(500).json({ 
      error: 'Missing configuration'
    });
  }

  try {
    // Load category mappings from CSV
    const categoryMappings = loadCategoryMappings();
    
    // Fetch all data using the working pagination method
    const allResults: Project[] = [];
    let cursor = 0;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 20;
    
    const url = `${baseUrl}/tinyproject`;
    
    while (hasMore && pageCount < maxPages) {
      const fetchUrl = `${url}?count=100&cursor=${cursor}`;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.response?.results) {
        const pageResults = data.response.results;
        
        // Map category IDs to names
        const mappedResults = pageResults.map((project: any) => {
          if (project.Category && categoryMappings[project.Category]) {
            project.CategoryName = categoryMappings[project.Category];
          }
          return project;
        });
        
        allResults.push(...mappedResults);
        
        const remaining = data.response.remaining || 0;
        cursor += pageResults.length;
        hasMore = remaining > 0 && pageResults.length > 0;
        pageCount++;
      } else {
        hasMore = false;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Analyze success patterns
    const soldProjects = allResults.filter(p => 
      p.Sold === 'yes' || p.Sold === true || p.Sold === 'true'
    );
    
    const activeProjects = allResults.filter(p => 
      p.Active === 'yes' || p.Active === true || p.Active === 'true'
    );

    // Analyze successful (sold) projects
    const successAnalysis = {
      totalProjects: allResults.length,
      soldProjects: soldProjects.length,
      activeProjects: activeProjects.length,
      successRate: soldProjects.length / allResults.length,
      
      // Category mappings info
      categoryMappingsLoaded: Object.keys(categoryMappings).length,
      
      // Price analysis for sold projects
      soldPriceStats: calculatePriceStats(soldProjects),
      activePriceStats: calculatePriceStats(activeProjects),
      
      // NEW: Valuation metrics based on sold projects
      valuationMetrics: calculateValuationMetrics(soldProjects, categoryMappings),
      
      // Category analysis with proper names
      soldCategories: getCategoryDistribution(soldProjects, categoryMappings),
      activeCategories: getCategoryDistribution(activeProjects, categoryMappings),
      
      // Success factors analysis
      successFactors: analyzeSoldProjects(soldProjects),
      
      // Sample successful projects with category names
      successfulExamples: soldProjects.slice(0, 5).map(p => ({
        name: p.Name || 'Unknown',
        price: p['Price (high)'] || p['Price (low)'],
        categoryId: p.Category,
        categoryName: p.CategoryName || categoryMappings[p.Category || ''] || 'Unknown',
        netProfit: p['Net Profit'],
        mrr: p.MRR,
        communitySize: p['Community Size'],
        estimatedValue: estimateProjectValue(p, categoryMappings, soldProjects)
      })),
      
      // Most successful categories
      topSuccessfulCategories: getTopSuccessfulCategories(soldProjects, activeProjects, categoryMappings)
    };

    res.status(200).json(successAnalysis);

  } catch (error) {
    console.error('Error analyzing success patterns:', error);
    res.status(500).json({
      error: 'Failed to analyze data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function calculatePriceStats(projects: Project[]) {
  const prices = projects
    .map(p => p['Price (high)'] || p['Price (low)'] || 0)
    .filter(price => price > 0);
    
  if (prices.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
  
  return {
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    min: Math.min(...prices),
    max: Math.max(...prices),
    count: prices.length
  };
}

function getCategoryDistribution(projects: Project[], categoryMappings: CategoryMapping) {
  const categories: { [key: string]: number } = {};
  
  projects.forEach(p => {
    const categoryId = p.Category || 'Unknown';
    const categoryName = categoryMappings[categoryId] || categoryId || 'Unknown';
    categories[categoryName] = (categories[categoryName] || 0) + 1;
  });
  
  // Return top 10 categories
  return Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));
}

function analyzeSoldProjects(soldProjects: Project[]) {
  const factors = {
    avgNetProfit: 0,
    avgMRR: 0,
    avgCommunitySize: 0,
    avgMonthlyExpense: 0,
    commonCharacteristics: [] as string[]
  };
  
  const netProfits = soldProjects
    .map(p => p['Net Profit'] || 0)
    .filter(p => p > 0);
    
  const mrrs = soldProjects
    .map(p => p.MRR || 0)
    .filter(m => m > 0);
    
  const communitySizes = soldProjects
    .map(p => p['Community Size'] || 0)
    .filter(c => c > 0);
    
  if (netProfits.length > 0) {
    factors.avgNetProfit = Math.round(netProfits.reduce((a, b) => a + b, 0) / netProfits.length);
  }
  
  if (mrrs.length > 0) {
    factors.avgMRR = Math.round(mrrs.reduce((a, b) => a + b, 0) / mrrs.length);
  }
  
  if (communitySizes.length > 0) {
    factors.avgCommunitySize = Math.round(communitySizes.reduce((a, b) => a + b, 0) / communitySizes.length);
  }
  
  return factors;
}

function getTopSuccessfulCategories(soldProjects: Project[], activeProjects: Project[], categoryMappings: CategoryMapping) {
  // Calculate success rate by category
  const categoryStats: { [key: string]: { sold: number; active: number; total: number; successRate: number; categoryName: string } } = {};
  
  // Count sold projects by category
  soldProjects.forEach(p => {
    const categoryId = p.Category || 'Unknown';
    const categoryName = categoryMappings[categoryId] || categoryId || 'Unknown';
    
    if (!categoryStats[categoryId]) {
      categoryStats[categoryId] = { sold: 0, active: 0, total: 0, successRate: 0, categoryName };
    }
    categoryStats[categoryId].sold++;
  });
  
  // Count active projects by category
  activeProjects.forEach(p => {
    const categoryId = p.Category || 'Unknown';
    const categoryName = categoryMappings[categoryId] || categoryId || 'Unknown';
    
    if (!categoryStats[categoryId]) {
      categoryStats[categoryId] = { sold: 0, active: 0, total: 0, successRate: 0, categoryName };
    }
    categoryStats[categoryId].active++;
  });
  
  // Calculate success rates
  Object.keys(categoryStats).forEach(categoryId => {
    const stats = categoryStats[categoryId];
    stats.total = stats.sold + stats.active;
    stats.successRate = stats.total > 0 ? stats.sold / stats.total : 0;
  });
  
  // Return top categories by success rate (minimum 3 total projects)
  return Object.entries(categoryStats)
    .filter(([, stats]) => stats.total >= 3)
    .sort(([, a], [, b]) => b.successRate - a.successRate)
    .slice(0, 10)
    .map(([categoryId, stats]) => ({
      categoryId,
      categoryName: stats.categoryName,
      soldCount: stats.sold,
      activeCount: stats.active,
      totalCount: stats.total,
      successRate: Math.round(stats.successRate * 100) / 100
    }));
}

// NEW: Calculate valuation metrics based on sold projects data
function calculateValuationMetrics(soldProjects: Project[], categoryMappings: CategoryMapping): ValuationMetrics {
  console.log(`Calculating valuation metrics from ${soldProjects.length} sold projects`);
  
  const metrics: ValuationMetrics = {
    avgRevenueMultiple: 0,
    avgProfitMultiple: 0,
    avgTrafficValue: 0,
    avgCommunityValue: 0,
    categoryMultipliers: {}
  };

  // Calculate revenue multiples (Price / MRR * 12)
  const revenueMultiples: number[] = [];
  soldProjects.forEach(p => {
    const price = p['Price (high)'] || p['Price (low)'] || 0;
    const mrr = p.MRR || 0;
    const annualRevenue = mrr * 12;
    
    if (price > 0 && annualRevenue > 0) {
      const multiple = price / annualRevenue;
      if (multiple > 0 && multiple < 100) { // Filter out outliers
        revenueMultiples.push(multiple);
      }
    }
  });

  // Calculate profit multiples (Price / Net Profit)
  const profitMultiples: number[] = [];
  soldProjects.forEach(p => {
    const price = p['Price (high)'] || p['Price (low)'] || 0;
    const profit = p['Net Profit'] || 0;
    
    if (price > 0 && profit > 0) {
      const multiple = price / profit;
      if (multiple > 0 && multiple < 100) { // Filter out outliers
        profitMultiples.push(multiple);
      }
    }
  });

  // Calculate traffic value (Price / Monthly Traffic)
  const trafficValues: number[] = [];
  soldProjects.forEach(p => {
    const price = p['Price (high)'] || p['Price (low)'] || 0;
    const traffic = p['Traffic (Unique Visitors/Month)'] || 0;
    
    if (price > 0 && traffic > 0) {
      const valuePerVisitor = price / traffic;
      if (valuePerVisitor > 0 && valuePerVisitor < 50) { // Filter out outliers
        trafficValues.push(valuePerVisitor);
      }
    }
  });

  // Calculate community value (Price / Community Size)
  const communityValues: number[] = [];
  soldProjects.forEach(p => {
    const price = p['Price (high)'] || p['Price (low)'] || 0;
    const community = p['Community Size'] || 0;
    
    if (price > 0 && community > 0) {
      const valuePerMember = price / community;
      if (valuePerMember > 0 && valuePerMember < 100) { // Filter out outliers
        communityValues.push(valuePerMember);
      }
    }
  });

  // Calculate category multipliers (average price ratio vs overall average)
  const categoryPrices: { [category: string]: number[] } = {};
  const allPrices = soldProjects
    .map(p => p['Price (high)'] || p['Price (low)'] || 0)
    .filter(price => price > 0);
  
  const overallAvgPrice = allPrices.length > 0 ? 
    allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

  soldProjects.forEach(p => {
    const price = p['Price (high)'] || p['Price (low)'] || 0;
    const categoryId = p.Category || 'Unknown';
    const categoryName = categoryMappings[categoryId] || categoryId || 'Unknown';
    
    if (price > 0) {
      if (!categoryPrices[categoryName]) {
        categoryPrices[categoryName] = [];
      }
      categoryPrices[categoryName].push(price);
    }
  });

  // Calculate multipliers for each category
  Object.entries(categoryPrices).forEach(([category, prices]) => {
    if (prices.length >= 2) { // Minimum 2 data points
      const categoryAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const multiplier = overallAvgPrice > 0 ? categoryAvg / overallAvgPrice : 1;
      metrics.categoryMultipliers[category] = Math.round(multiplier * 100) / 100;
    }
  });

  // Set calculated averages
  metrics.avgRevenueMultiple = revenueMultiples.length > 0 ? 
    Math.round((revenueMultiples.reduce((a, b) => a + b, 0) / revenueMultiples.length) * 100) / 100 : 2.5;
  
  metrics.avgProfitMultiple = profitMultiples.length > 0 ? 
    Math.round((profitMultiples.reduce((a, b) => a + b, 0) / profitMultiples.length) * 100) / 100 : 3.0;
  
  metrics.avgTrafficValue = trafficValues.length > 0 ? 
    Math.round((trafficValues.reduce((a, b) => a + b, 0) / trafficValues.length) * 100) / 100 : 0.1;
  
  metrics.avgCommunityValue = communityValues.length > 0 ? 
    Math.round((communityValues.reduce((a, b) => a + b, 0) / communityValues.length) * 100) / 100 : 5;

  console.log('Valuation metrics calculated:', {
    revenueMultiples: revenueMultiples.length,
    profitMultiples: profitMultiples.length,
    trafficValues: trafficValues.length,
    communityValues: communityValues.length,
    categories: Object.keys(metrics.categoryMultipliers).length
  });

  return metrics;
}

// NEW: Estimate project value based on available data and market multiples
function estimateProjectValue(project: Project, categoryMappings: CategoryMapping, soldProjects: Project[]): number {
  const categoryId = project.Category || 'Unknown';
  const categoryName = categoryMappings[categoryId] || categoryId || 'Unknown';
  
  // Get valuation metrics
  const metrics = calculateValuationMetrics(soldProjects, categoryMappings);
  
  let estimatedValue = 0;
  let valuationMethods = 0;

  // Method 1: Revenue-based valuation (MRR * 12 * multiple)
  const mrr = project.MRR || 0;
  if (mrr > 0) {
    const annualRevenue = mrr * 12;
    const revenueValue = annualRevenue * metrics.avgRevenueMultiple;
    estimatedValue += revenueValue;
    valuationMethods++;
  }

  // Method 2: Profit-based valuation (Net Profit * multiple)
  const netProfit = project['Net Profit'] || 0;
  if (netProfit > 0) {
    const profitValue = netProfit * metrics.avgProfitMultiple;
    estimatedValue += profitValue;
    valuationMethods++;
  }

  // Method 3: Traffic-based valuation
  const traffic = project['Traffic (Unique Visitors/Month)'] || 0;
  if (traffic > 0) {
    const trafficValue = traffic * metrics.avgTrafficValue;
    estimatedValue += trafficValue;
    valuationMethods++;
  }

  // Method 4: Community-based valuation
  const community = project['Community Size'] || 0;
  if (community > 0) {
    const communityValue = community * metrics.avgCommunityValue;
    estimatedValue += communityValue;
    valuationMethods++;
  }

  // Average the different valuation methods
  if (valuationMethods > 0) {
    estimatedValue = estimatedValue / valuationMethods;
  }

  // Apply category multiplier if available
  const categoryMultiplier = metrics.categoryMultipliers[categoryName] || 1;
  estimatedValue = estimatedValue * categoryMultiplier;

  // Minimum valuation for any project with some data
  if (estimatedValue < 500 && (mrr > 0 || netProfit > 0 || traffic > 1000 || community > 100)) {
    estimatedValue = 500;
  }

  return Math.round(estimatedValue);
}
