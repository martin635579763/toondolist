import { createApi } from 'unsplash-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// Note: In a real application, handle API keys more securely,
// perhaps by storing them in a server-side environment variable
// that is not exposed to the client-side.
const serverApi = createApi({
 accessKey: "__NWG7aDK46AN0mHLWtuInvMS7Kgd_FUyk7OAzUb3dA", // Ensure you have this env variable set
  fetch: fetch, // Use native fetch

});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid query parameter' });
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
      console.error("UNSPLASH_ACCESS_KEY is not set in environment variables.");
      return res.status(500).json({ message: 'Server configuration error: Unsplash API key not set.' });
  }

  try {
    const result = await serverApi.search.getPhotos({
      query: query,
      perPage: 12, // You can adjust the number of results
    });

    if (result.type === 'success') {
      const photoUrls = result.response.results.map(photo => photo.urls.regular);
      res.status(200).json({ urls: photoUrls });
    } else {
      console.error("Unsplash API error:", result.errors);
      res.status(result.status || 500).json({ message: 'Error fetching images from Unsplash', details: result.errors });
    }
  } catch (error) {
    console.error('Error in Unsplash API route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}