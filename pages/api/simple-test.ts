// pages/api/simple-test.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const baseUrl = process.env.TA_API_BASE;
  const token = process.env.TA_TOKEN;
  const limit = req.query.limit || '100';

  if (!baseUrl || !token) {
    return res.status(500).json({ 
      error: 'Missing configuration' 
    });
  }

  try {
    const endpoint = `${baseUrl}/tinyproject?api_token=${token}&limit=${limit}`;
    
    console.log(`Testing: ${endpoint.replace(token, 'TOKEN_HIDDEN')}`);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Pre-Revenue-AI/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `API returned ${response.status}`,
        endpoint: endpoint.replace(token, 'TOKEN_HIDDEN')
      });
    }

    const data = await response.json();
    
    let projects = [];
    let totalCount = 0;
    
    if (Array.isArray(data)) {
      projects = data;
      totalCount = data.length;
    } else if (data.response && Array.isArray(data.response.results)) {
      projects = data.response.results;
      totalCount = data.response.count || projects.length;
    } else if (data.results && Array.isArray(data.results)) {
      projects = data.results;
      totalCount = data.total || projects.length;
    }

    res.status(200).json({
      success: true,
      endpoint: endpoint.replace(token, 'TOKEN_HIDDEN'),
      projectCount: projects.length,
      totalCount,
      dataStructure: typeof data === 'object' ? Object.keys(data) : 'unknown',
      responseKeys: data && typeof data === 'object' ? Object.keys(data) : [],
      sampleProject: projects[0] ? {
        id: projects[0]._id?.substring(0, 8) + '...',
        fields: Object.keys(projects[0])
      } : null,
      hasMoreData: data.response?.remaining || false
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
