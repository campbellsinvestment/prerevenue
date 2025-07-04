// pages/api/littleexits/index.ts
import { NextApiRequest, NextApiResponse } from 'next';

// Remove the cors dependency since we don't need it for this internal API

interface ProjectData {
  _id: string;
  title: string;
  description: string;
  price: number;
  website?: string;
  categories?: string[];
  metrics?: {
    users?: number;
    traffic?: number;
    revenue?: number;
  };
  sold?: boolean;
  sold_date?: string;
  success_indicators?: {
    has_users: boolean;
    has_traffic: boolean;
    has_revenue: boolean;
    active_development: boolean;
  };
}

const handlers = {
  // Fetch a specific project by ID from Little Exits
  fetchProject: async (req: NextApiRequest, res: NextApiResponse) => {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    try {
      const apiUrl = `${process.env.TA_API_BASE}/tinyproject/${projectId}?api_token=${process.env.TA_TOKEN}`;
      
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

      const projectData: ProjectData = await response.json();
      
      res.status(200).json(projectData);
    } catch (error) {
      console.error('Error fetching project from Little Exits:', error);
      res.status(500).json({ 
        error: 'Failed to fetch project data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Fetch multiple projects with filtering
  fetchProjects: async (req: NextApiRequest, res: NextApiResponse) => {
    const { 
      limit = 50, 
      sold = null, 
      minPrice = null, 
      maxPrice = null,
      category = null 
    } = req.body;

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('api_token', process.env.TA_TOKEN!);
      params.append('limit', limit.toString());
      
      if (sold !== null) params.append('sold', sold.toString());
      if (minPrice !== null) params.append('min_price', minPrice.toString());
      if (maxPrice !== null) params.append('max_price', maxPrice.toString());
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

      const projectsData = await response.json();
      
      res.status(200).json(projectsData);
    } catch (error) {
      console.error('Error fetching projects from Little Exits:', error);
      res.status(500).json({ 
        error: 'Failed to fetch projects data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Analyze a project and calculate success probability based on Little Exits data
  analyzeProject: async (req: NextApiRequest, res: NextApiResponse) => {
    const { projectData } = req.body;

    if (!projectData) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    try {
      // Fetch similar sold projects for comparison
      const soldProjectsResponse = await fetch(`${process.env.TA_API_BASE}/tinyprojects?api_token=${process.env.TA_TOKEN}&sold=true&limit=100`);
      
      if (!soldProjectsResponse.ok) {
        throw new Error('Failed to fetch sold projects for analysis');
      }

      const soldProjects = await soldProjectsResponse.json();
      
      // Calculate success score based on patterns from sold projects
      const successScore = calculateSuccessScore(projectData, soldProjects);
      
      res.status(200).json({ 
        successScore,
        analysis: {
          totalSoldProjects: soldProjects.length,
          similarProjects: findSimilarProjects(projectData, soldProjects),
          successFactors: identifySuccessFactors(projectData)
        }
      });
    } catch (error) {
      console.error('Error analyzing project:', error);
      res.status(500).json({ 
        error: 'Failed to analyze project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Test API connection
  testConnection: async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const testUrl = `${process.env.TA_API_BASE}/ping?api_token=${process.env.TA_TOKEN}`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Pre-Revenue-AI/1.0',
        },
      });

      const isConnected = response.ok;
      
      res.status(200).json({ 
        connected: isConnected,
        status: response.status,
        apiBase: process.env.TA_API_BASE,
        hasToken: !!process.env.TA_TOKEN
      });
    } catch (error) {
      console.error('Error testing API connection:', error);
      res.status(500).json({ 
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Helper functions for analysis
function calculateSuccessScore(projectData: any, soldProjects: any[]): number {
  let score = 50; // Base score

  // Factor 1: User base (25 points max)
  if (projectData.user_base) {
    const avgUserBase = soldProjects.reduce((sum, p) => sum + (p.metrics?.users || 0), 0) / soldProjects.length;
    if (projectData.user_base > avgUserBase) score += 15;
    else if (projectData.user_base > avgUserBase * 0.5) score += 10;
    else if (projectData.user_base > 0) score += 5;
  }

  // Factor 2: Traffic (20 points max)
  if (projectData.traffic) {
    const avgTraffic = soldProjects.reduce((sum, p) => sum + (p.metrics?.traffic || 0), 0) / soldProjects.length;
    if (projectData.traffic > avgTraffic) score += 15;
    else if (projectData.traffic > avgTraffic * 0.5) score += 10;
    else if (projectData.traffic > 0) score += 5;
  }

  // Factor 3: Price positioning (15 points max)
  const avgPrice = soldProjects.reduce((sum, p) => sum + (p.price || 0), 0) / soldProjects.length;
  if (projectData.price && projectData.price <= avgPrice * 1.2) score += 10;

  // Factor 4: Category popularity (10 points max)
  if (projectData.categories && projectData.categories.length > 0) {
    const popularCategories = ['SaaS', 'E-commerce', 'Mobile App', 'Web App'];
    const hasPopularCategory = projectData.categories.some((cat: string) => 
      popularCategories.some(popular => cat.toLowerCase().includes(popular.toLowerCase()))
    );
    if (hasPopularCategory) score += 10;
    else score += 5;
  }

  // Factor 5: Description quality (10 points max)
  if (projectData.description) {
    const descLength = projectData.description.length;
    if (descLength > 500) score += 10;
    else if (descLength > 250) score += 7;
    else if (descLength > 100) score += 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

function findSimilarProjects(projectData: any, soldProjects: any[]): any[] {
  return soldProjects
    .filter(p => {
      // Find projects in similar price range
      const priceRange = projectData.price * 0.5;
      return Math.abs(p.price - projectData.price) <= priceRange;
    })
    .slice(0, 5);
}

function identifySuccessFactors(projectData: any): string[] {
  const factors: string[] = [];
  
  if (projectData.user_base > 1000) factors.push('Strong user base');
  if (projectData.traffic > 5000) factors.push('Good traffic volume');
  if (projectData.monthly_cost < 100) factors.push('Low operating costs');
  if (projectData.description && projectData.description.length > 300) factors.push('Detailed description');
  if (projectData.categories && projectData.categories.length > 0) factors.push('Clear categorization');
  
  return factors;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const handler = handlers[req.body.method as keyof typeof handlers];
  
    if (handler) {
      await handler(req, res);
    } else {
      res.status(404).json({ error: 'Handler not found' });
    }
  } catch (error) {
    console.error('Error in Little Exits API route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
