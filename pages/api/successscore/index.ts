// pages/api/successscore.js
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
}

try {
    const formData = req.body;
    const successScore = await getSuccessScoreFromChatGPT(formData);

    res.status(200).json({ successScore });
} catch (error) {
    console.error('Error calculating success score:', error);
    res.status(500).json({ error: 'Internal Server Error' });
}


async function getSuccessScoreFromChatGPT(formData: FormData) {
    const prompt = constructPrompt(formData);
    // Call your Next.js API route here instead of openai.createCompletion
    const gptResponse = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  
    if (!gptResponse.ok) {
      throw new Error("Failed to get response from OpenAI");
    }
  
    const { choices } = await gptResponse.json();
    const score = interpretResponse(choices[0].text);
    return score;
  }
  
  function constructPrompt(formData: FormData): string {
    // Extract values from formData
    const title = formData.get('title') as string;
    const tagline = formData.get('tagline') as string;
    const description = formData.get('description') as string;
    const userBase = formData.get('user_base') as string;
    const monthlyTraffic = formData.get('traffic') as string;
    const categories = formData.getAll('categories[]'); // Assuming categories are stored with the key 'categories[]'
    const startDate = formData.get('date_started') as string;
    const price = formData.get('price') as string;
    const monthlyCost = formData.get('monthly_cost') as string;

    // Format categories into a comma-separated string
    const categoriesFormatted = categories.join(', ');

    // Construct the prompt based on Little Exits success patterns
    return `You are an expert startup analyst trained on data from Little Exits, analyzing pre-revenue startup success potential.

Based on Little Exits marketplace data showing successful startup acquisitions, evaluate this startup:

Title: "${title}"
Tagline: ${tagline}
Description: ${description}
User Base: ${userBase} users
Monthly Traffic: ${monthlyTraffic} unique visitors
Categories/Tech Stack: ${categoriesFormatted}
Started: ${startDate}
Asking Price: $${price}
Monthly Operating Costs: $${monthlyCost}

Analyze these key success factors from Little Exits data:
1. Market demand and category trends
2. User traction vs time in market
3. Revenue potential and pricing strategy
4. Technical stack viability
5. Description quality and business model clarity
6. Traffic-to-user conversion efficiency
7. Cost structure sustainability

Provide a success score from 0-100 where:
- 0-30: Low likelihood of successful exit
- 31-60: Moderate potential with improvements needed
- 61-80: Strong potential for acquisition
- 81-100: Exceptional startup with high exit probability

Return your response in this exact format: "Score: [number]"`;
}

  
  
  function interpretResponse(responseText: string) {
    const scorePattern = /Score: (\d+)/;
    const match = responseText.match(scorePattern);
    return match ? parseInt(match[1], 10) : 0;
  }
};