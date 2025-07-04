// pages/api/fetch-littleexits-data.ts
import { NextApiRequest, NextApiResponse } from 'next';

interface LittleExitsProject {
  _id: string;
  Name?: string;
  Description?: string;
  Category?: string;
  'Price (high)'?: number;
  'Price (low)'?: number;
  MRR?: number;
  'Net Profit': number;
  'Community Size': number;
  'Monthly Expense'?: number;
  Active: boolean;
  Hidden: boolean;
  'Sold?': boolean;
  'Created Date'?: string;
  'Modified Date': string;
  Link?: string;
  icon?: string;
  'cover image'?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const baseUrl = process.env.TA_API_BASE;
  const token = process.env.TA_TOKEN;

  if (!baseUrl || !token) {
    return res.status(500).json({ 
      error: 'Missing API configuration',
      hasBaseUrl: !!baseUrl,
      hasToken: !!token
    });
  }

  try {
    const response = await fetch(`${baseUrl}/tinyproject?api_token=${token}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Pre-Revenue-AI/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.response || !data.response.results) {
      throw new Error('Invalid response format from Little Exits API');
    }

    const projects: LittleExitsProject[] = data.response.results;
    
    // Filter and process the data
    const processedProjects = projects.map(project => ({
      id: project._id,
      title: project.Name || 'Untitled Project',
      description: project.Description || '',
      askingPriceHigh: project['Price (high)'] || 0,
      askingPriceLow: project['Price (low)'] || 0,
      mrr: project.MRR || 0,
      netProfit: project['Net Profit'] || 0,
      communitySize: project['Community Size'] || 0,
      monthlyExpense: project['Monthly Expense'] || 0,
      category: project.Category || '',
      isSold: project['Sold?'] || false,
      isActive: project.Active || false,
      isHidden: project.Hidden || false,
      createdDate: project['Created Date'] || project['Modified Date'],
      modifiedDate: project['Modified Date'],
      link: project.Link || '',
      icon: project.icon || '',
      coverImage: project['cover image'] || ''
    }));

    // Separate sold vs available projects
    const soldProjects = processedProjects.filter(p => p.isSold);
    const availableProjects = processedProjects.filter(p => !p.isSold && p.isActive && !p.isHidden);

    const stats = {
      total: projects.length,
      sold: soldProjects.length,
      available: availableProjects.length,
      hidden: processedProjects.filter(p => p.isHidden).length,
      inactive: processedProjects.filter(p => !p.isActive).length,
      avgAskingPriceHigh: availableProjects.length > 0 
        ? Math.round(availableProjects.reduce((sum, p) => sum + p.askingPriceHigh, 0) / availableProjects.length)
        : 0,
      avgSoldPriceHigh: soldProjects.length > 0
        ? Math.round(soldProjects.reduce((sum, p) => sum + p.askingPriceHigh, 0) / soldProjects.length)
        : 0,
      avgMRR: availableProjects.length > 0
        ? Math.round(availableProjects.reduce((sum, p) => sum + p.mrr, 0) / availableProjects.length)
        : 0
    };

    res.status(200).json({
      success: true,
      stats,
      soldProjects: soldProjects.slice(0, 10), // First 10 sold projects for analysis
      availableProjects: availableProjects.slice(0, 10), // First 10 available projects
      sampleFields: projects.length > 0 ? Object.keys(projects[0]) : []
    });

  } catch (error) {
    console.error('Error fetching Little Exits data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from Little Exits',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
