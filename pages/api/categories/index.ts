// pages/api/categories/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const categoriesPath = path.join(process.cwd(), 'data', 'categories.json');
    const categoriesData = fs.readFileSync(categoriesPath, 'utf8');
    const categories = JSON.parse(categoriesData);
    
    // Extract unique category values and sort them
    const categoryValues = Object.values(categories) as string[];
    const uniqueCategories = Array.from(new Set(categoryValues));
    uniqueCategories.sort();
    
    res.status(200).json({ categories: uniqueCategories });
  } catch (error) {
    console.error('Error loading categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
