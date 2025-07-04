// pages/api/test-connection.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Test Little Exits API connection
    const response = await fetch(`${process.env.TA_API_BASE}/ping?api_token=${process.env.TA_TOKEN}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Pre-Revenue-AI/1.0',
      },
    });

    const connectionStatus = {
      littleExitsApi: {
        connected: response.ok,
        status: response.status,
        baseUrl: process.env.TA_API_BASE,
        hasToken: !!process.env.TA_TOKEN,
        tokenLength: process.env.TA_TOKEN ? process.env.TA_TOKEN.length : 0
      },
      environment: {
        supabase: !!process.env.SUPABASE_URL,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        appUrl: process.env.NEXT_PUBLIC_APP_URL
      }
    };

    res.status(200).json(connectionStatus);
  } catch (error) {
    console.error('Error testing connections:', error);
    res.status(500).json({ 
      error: 'Failed to test connections',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
