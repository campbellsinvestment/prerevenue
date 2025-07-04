// pages/api/cron/update-market-data.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is being called by a cron service or authorized source
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting weekly market data update...');
    
    // Call the market analysis API to update data
    const updateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/market-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!updateResponse.ok) {
      throw new Error(`Market analysis update failed with status ${updateResponse.status}`);
    }

    const result = await updateResponse.json();
    
    console.log('Market data updated successfully:', {
      totalProjects: result.data.totalProjects,
      soldProjects: result.data.soldProjects,
      topCategories: result.data.successPatterns.topCategories.slice(0, 5),
      lastUpdated: result.data.lastUpdated
    });

    res.status(200).json({ 
      success: true,
      message: 'Market data updated successfully',
      stats: {
        totalProjects: result.data.totalProjects,
        soldProjects: result.data.soldProjects,
        categoriesAnalyzed: Object.keys(result.data.categoryMultipliers).length,
        lastUpdated: result.data.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error updating market data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update market data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/*
To set up weekly updates, you can:

1. Use Vercel Cron Jobs (add to vercel.json):
{
  "crons": [{
    "path": "/api/cron/update-market-data",
    "schedule": "0 2 * * 1"
  }]
}

2. Use external cron service like cron-job.org:
- URL: https://yourdomain.com/api/cron/update-market-data
- Schedule: Weekly (Monday at 2 AM)
- Add Authorization header: Bearer YOUR_CRON_SECRET

3. Use GitHub Actions (weekly schedule):
- Create .github/workflows/update-market-data.yml
- Schedule: "0 2 * * 1" (Monday at 2 AM UTC)
- Make HTTP POST to your endpoint

Set CRON_SECRET environment variable for security.
*/
