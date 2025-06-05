import fetch from 'node-fetch';

interface UnsplashPhoto {
  id: string;
  urls: {
    regular: string;
  };
  alt_description: string;
}

export async function searchPhotos(query: string): Promise<UnsplashPhoto[]> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error fetching photos: ${response.statusText}`);
    }

    const data: any = await response.json(); // Using 'any' for flexibility with the API response structure

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error("Invalid data format from Unsplash API");
    }

    // Map the relevant data to the UnsplashPhoto interface
    const photos: UnsplashPhoto[] = data.results.map((photo: any) => ({
      id: photo.id,
      urls: {
        regular: photo.urls.regular,
      },
      alt_description: photo.alt_description,
    }));

    return photos;
  } catch (error) {
    console.error("Error in searchPhotos:", error);
    throw error;
  }
}