// pages/api/test-littleexits.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const baseUrl = process.env.TA_API_BASE;
  const token = process.env.TA_TOKEN;

  if (!baseUrl || !token) {
    return res.status(500).json({ 
      error: 'Missing configuration',
      hasBaseUrl: !!baseUrl,
      hasToken: !!token
    });
  }

  try {
    const results: any[] = [];
    let cursor = 0;
    const pageSize = 100;
    let hasMore = true;
    let totalFetched = 0;
    const maxPages = 10; // Safety limit
    let pageCount = 0;

    // Use the correct format based on the working example
    const url = `${baseUrl}/tinyproject`;
    
    while (hasMore && pageCount < maxPages) {
      console.log(`Fetching page ${pageCount + 1} with cursor ${cursor}`);
      
      const params = new URLSearchParams({
        count: pageSize.toString(),
        cursor: cursor.toString()
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Pre-Revenue-AI/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.response && data.response.results) {
        const pageResults = data.response.results;
        results.push(...pageResults);
        
        const remaining = data.response.remaining || 0;
        totalFetched += pageResults.length;
        
        console.log(`Page ${pageCount + 1}: Got ${pageResults.length} results, ${remaining} remaining`);
        
        // Update cursor for next page
        cursor += pageSize;
        
        // Check if we have more data
        hasMore = remaining > 0 && pageResults.length > 0;
        pageCount++;
        
        // If we got fewer results than requested, we're probably at the end
        if (pageResults.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
        console.log('No results structure found in response');
      }
    }

    // Analyze the data we got
    const soldProjects = results.filter(p => p.Sold === 'yes' || p.Sold === true || p.sold === true);
    const availableProjects = results.filter(p => p.Active === 'yes' || p.Active === true || p.active === true);
    
    // Sample project for structure analysis
    const sampleProject = results[0] || {};
    const fieldNames = Object.keys(sampleProject);

    res.status(200).json({
      success: true,
      message: `Successfully fetched ${totalFetched} projects from Little Exits`,
      totalProjects: totalFetched,
      pagesProcessed: pageCount,
      soldProjects: soldProjects.length,
      availableProjects: availableProjects.length,
      expectedTotal: 600,
      fullyFetched: totalFetched >= 600,
      sampleProject: sampleProject,
      availableFields: fieldNames,
      // First few projects for review
      projectSamples: results.slice(0, 3).map(p => ({
        name: p.Name || p.name || 'Unknown',
        price: p['Price (high)'] || p.price || 'Unknown',
        sold: p.Sold || p.sold || 'Unknown',
        active: p.Active || p.active || 'Unknown',
        category: p.Category || p.category || 'Unknown'
      }))
    });

  } catch (error) {
    console.error('Error fetching Little Exits data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
