// pages/api/fetch-all-data.ts
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
    const allResults: any[] = [];
    let cursor = 0;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 20; // Allow for more pages to get all 600
    
    const url = `${baseUrl}/tinyproject`;
    
    while (hasMore && pageCount < maxPages) {
      console.log(`Fetching page ${pageCount + 1}, cursor: ${cursor}`);
      
      // Build URL with parameters like the Python example
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
      
      if (data.response && data.response.results) {
        const pageResults = data.response.results;
        allResults.push(...pageResults);
        
        const remaining = data.response.remaining || 0;
        
        console.log(`Page ${pageCount + 1}: Got ${pageResults.length} results, ${remaining} remaining`);
        
        // Update cursor - move by the number of results we got
        cursor += pageResults.length;
        
        // Continue if there are more results
        hasMore = remaining > 0 && pageResults.length > 0;
        pageCount++;
      } else {
        console.log('No response.results found, stopping');
        hasMore = false;
      }
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Analyze the data
    const soldCount = allResults.filter(p => 
      p.Sold === 'yes' || p.Sold === true || p.sold === true
    ).length;
    
    const activeCount = allResults.filter(p => 
      p.Active === 'yes' || p.Active === true || p.active === true
    ).length;

    // Get field names from a sample project
    const sampleProject = allResults[0] || {};
    const fieldNames = Object.keys(sampleProject);

    res.status(200).json({
      success: true,
      totalFetched: allResults.length,
      expectedTotal: 600,
      pagesProcessed: pageCount,
      soldProjects: soldCount,
      activeProjects: activeCount,
      sampleFields: fieldNames.slice(0, 10), // First 10 fields
      sampleProject: {
        Name: sampleProject.Name,
        'Price (high)': sampleProject['Price (high)'],
        Category: sampleProject.Category,
        Sold: sampleProject.Sold,
        Active: sampleProject.Active,
        'Modified Date': sampleProject['Modified Date']
      },
      message: allResults.length >= 500 ? 
        '🎉 Successfully fetched most/all projects!' : 
        `⚠️ Only fetched ${allResults.length} projects, expected 600`
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to fetch data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
