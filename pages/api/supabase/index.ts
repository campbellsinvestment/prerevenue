// api/supabase.js
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';

interface Startup {
  id: number;
  // ... other relevant fields
}

interface SupabaseInsertResponse {
  data: Startup[] | null;
  error: Error | null; // Include the error property
}


// Initialize cors middleware
const cors = Cors({
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  origin: process.env.NEXT_PUBLIC_APP_URL,
});

// Helper method to run middleware
const runMiddleware = async (req: NextApiRequest, res: NextApiResponse, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
};

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  
const handlers = {

        fetchStartups: async (req: NextApiRequest, res: NextApiResponse) => {
            try {
            const { data, error } = await supabase
                .from('startups')
                .select('*')
                .order('success_score', { ascending: false });
        
            if (error) throw error;
        
            res.status(200).json(data);
            } catch (err) {
            res.status(500).json({ status: 'error', message: 'Failed to fetch startups.' });
            }
        },

        fetchStartupDetails: async (req: NextApiRequest, res: NextApiResponse) => {
            const { startupId } = req.query; 
        
            try {
            const { data: startupData, error: startupError } = await supabase
                .from('startups')
                .select('*')
                .eq('id', startupId)
                .single();
        
            if (startupError) throw startupError;
        
            const { data: categoriesData, error: categoriesError } = await supabase
                .from('startup_categories')
                .select(`
                    categories (
                    name
                    )
                `)
                .eq('startup_id', startupId);

                if (categoriesError) throw categoriesError;

                // Assuming categoriesData is an array of objects, each with a 'categories' key
                const response = {
                ...startupData,
                categories: categoriesData.map(catData => catData.categories.map(cat => cat.name)).flat()
                };
        
            res.status(200).json(response);
            } catch (err) {
            res.status(500).json({ status: 'error', message: 'Failed to fetch startup details.' });
            }
        },

        checkStartupExists: async (req: NextApiRequest, res: NextApiResponse) => {
          const { startup_url } = req.body;
        
          if (!startup_url) {
            return res.status(400).json({ status: 'error', message: 'Startup URL is required' });
          }
        
          try {
            const { data, error } = await supabase
              .from('startups')
              .select('id')
              .eq('startup_url', startup_url)
              .limit(1);  // Ensure that only one (or zero) rows are returned
        
            if (error) {
              console.error('Supabase error:', error);
              return res.status(500).json({ status: 'error', message: 'Error in checking startup URL', details: error });
            }
        
            if (data.length > 0) {
              // A record with the same URL exists
              return res.status(400).json({ status: 'error', message: 'Startup URL already exists' });
            } else {
              // No record found, URL does not exist
              return res.status(200).json({ status: 'ok', message: 'Startup URL does not exist' });
            }
          } catch (error) {
            console.error('Error in checkStartupExists:', error);
            return res.status(500).json({ status: 'error', message: 'Internal server error', details: error });
          }
        },        

        storeStartupData: async (req: NextApiRequest, res: NextApiResponse) => {
          const { formData, selectedCategories } = req.body;
        
          try {
            const scoreResponse = await fetch('/api/successscore', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({method: 'getSuccessScoreFromChatGPT', formData}),
            });
        
            if (!scoreResponse.ok) {
              throw new Error('Failed to get success score');
            }
        
            const { successScore } = await scoreResponse.json();
        
            const { data: startupData, error: startupError } = await supabase
              .from('startups')
              .insert([{ ...formData, success_score: successScore }]) as SupabaseInsertResponse;
        
            if (startupError) {
              throw startupError;
            }
        
            if (!startupData || startupData.length === 0) {
              throw new Error('Failed to insert startup data');
            }
        
            const startupId = startupData[0].id;
        
            const categoryInsertions = selectedCategories.map((categoryId: number) => ({
              startup_id: startupId,
              category_id: categoryId
            }));
        
            const { error: categoryError } = await supabase
              .from('startup_categories')
              .insert(categoryInsertions);
        
            if (categoryError) {
              throw categoryError;
            }
        
            res.status(200).json({ startupData, message: 'Startup and categories stored successfully' });
          } catch (error) {
            console.error('Error in storeStartupData:', error);
            res.status(500).json({ status: 'error', message: 'Failed to store startup data.', details: error });
          }
        },        
        
        activateStartup: async (req: NextApiRequest, res: NextApiResponse) => {
          const { startupId } = req.body;

          try {
              const { data, error } = await supabase
              .from('startups')
              .update({ is_active: true })
              .eq('id', startupId);

              if (error) {
              throw error;
              }

              res.status(200).json({ message: 'Startup activated successfully', data });
          } catch (error) {
              console.error('Error in activateStartup:', error);
              res.status(500).json({ status: 'error', message: 'Failed to activate startup.' });
          }
        },

        fetchCategories: async (req: NextApiRequest, res: NextApiResponse) => {
          try {
            const { data, error } = await supabase
              .from('categories')
              .select('*');
        
            if (error) {
              console.error('Supabase error:', error);
              return res.status(500).json({ status: 'error', message: 'Error in fetching categories', details: error });
            }
        
            if (!data || data.length === 0) {
              return res.status(404).json({ status: 'error', message: 'No categories found' });
            }
        
            res.status(200).json(data);
          } catch (error) {
            console.error('Error in fetchCategories:', error);
            return res.status(500).json({ status: 'error', message: 'Internal server error', details: error });
          }
        },
};


export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    console.log("API route was called with method:", req.body.method);

    // Run cors middleware
    await runMiddleware(req, res, cors);

    const handler = handlers[req.body.method as keyof typeof handlers];
  
    if (handler) {
      await handler(req, res);
    } else {
      res.status(404).json({ error: 'Handler not found' });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
