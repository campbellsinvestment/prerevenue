// pages/api/top-performers/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

const MARKET_DATA_PATH = path.join(process.cwd(), 'data', 'market-analysis.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to load existing market data
    let marketData;
    if (fs.existsSync(MARKET_DATA_PATH)) {
      const data = fs.readFileSync(MARKET_DATA_PATH, 'utf8');
      marketData = JSON.parse(data);
    } else {
      // Return default data if no analysis exists yet
      marketData = {
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

    res.status(200).json({
      topPerformers: marketData.topPerformers,
      lastUpdated: marketData.lastUpdated || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch top performers data' });
  }
}
