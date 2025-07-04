// pages/api/fetch-all-projects.ts
import { NextApiRequest, NextApiResponse } from 'next';

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
    // Try to fetch with higher limits
    const endpoints = [
      `${baseUrl}/tinyproject?api_token=${token}&limit=1000`,
      `${baseUrl}/tinyproject?api_token=${token}&count=1000`,
      `${baseUrl}/tinyproject?api_token=${token}&per_page=1000`,
      `${baseUrl}/tinyproject?api_token=${token}`,
    ];

    let allProjects = [];
    let bestEndpoint = '';
    let totalCount = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'User-Agent': 'Pre-Revenue-AI/1.0',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        let projects = [];
        if (Array.isArray(data)) {
          projects = data;
        } else if (data.response && Array.isArray(data.response.results)) {
          projects = data.response.results;
          totalCount = data.response.count || projects.length;
        } else if (data.results && Array.isArray(data.results)) {
          projects = data.results;
        }

        if (projects.length > allProjects.length) {
          allProjects = projects;
          bestEndpoint = endpoint;
        }

        console.log(`Endpoint ${endpoint} returned ${projects.length} projects`);

        // If we got close to 600, this might be the right endpoint
        if (projects.length >= 500) {
          break;
        }

      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error);
        continue;
      }
    }

    // If we still don't have enough, try pagination
    if (allProjects.length < 500) {
      console.log(`Only got ${allProjects.length} projects, trying pagination...`);
      
      // Try pagination approach
      let page = 0;
      const pageSize = 100;
      const maxPages = 10; // Prevent infinite loops
      
      while (page < maxPages) {
        try {
          const paginatedEndpoint = `${baseUrl}/tinyproject?api_token=${token}&limit=${pageSize}&offset=${page * pageSize}`;
          
          const response = await fetch(paginatedEndpoint, {
            method: 'GET',
            headers: {
              'User-Agent': 'Pre-Revenue-AI/1.0',
              'Accept': 'application/json',
            },
          });

          if (!response.ok) break;

          const data = await response.json();
          let pageProjects = [];
          
          if (Array.isArray(data)) {
            pageProjects = data;
          } else if (data.response && Array.isArray(data.response.results)) {
            pageProjects = data.response.results;
          }

          if (pageProjects.length === 0) break; // No more data

          if (page === 0) {
            allProjects = pageProjects;
          } else {
            allProjects = [...allProjects, ...pageProjects];
          }

          console.log(`Page ${page + 1}: Added ${pageProjects.length} projects (total: ${allProjects.length})`);
          
          page++;
          
          // If we got less than pageSize, we're done
          if (pageProjects.length < pageSize) break;
          
        } catch (error) {
          console.error(`Error with pagination page ${page}:`, error);
          break;
        }
      }
    }

    // Analyze the data we got
    const soldProjects = allProjects.filter((p: any) => 
      p.sold === true || p.Sold === true || p['Sold'] === 'yes' || p.status === 'sold'
    );

    const activeProjects = allProjects.filter((p: any) => 
      p.active === true || p.Active === true || p['Active'] === 'yes' || p.status === 'active'
    );

    res.status(200).json({
      success: true,
      totalProjects: allProjects.length,
      expectedTotal: 600,
      soldProjects: soldProjects.length,
      activeProjects: activeProjects.length,
      bestEndpoint: bestEndpoint.replace(token, 'TOKEN_HIDDEN'),
      sampleProject: allProjects[0] ? {
        ...allProjects[0],
        // Hide sensitive data
        _id: allProjects[0]._id?.substring(0, 8) + '...',
      } : null,
      availableFields: allProjects[0] ? Object.keys(allProjects[0]) : []
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ 
      error: 'Failed to fetch projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
