type SearchResult = {
  id: string;
  score: number;
  metadata: Record<string, any>;
};

type MusicSearchResponse = {
  success: boolean;
  results?: SearchResult[];
  error?: string;
};

/**
 * client-side function to search for similar music
 */
export async function searchSimilarMusic(
  userInput: string,
  limit: number = 5
): Promise<MusicSearchResponse> {
  try {
    console.log('Making API request to /api/musicSearch');
    
    const response = await fetch('/api/musicSearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userInput, limit }),
    });

    console.log('Response status:', response.status);

    // check if response is ok before trying to parse JSON
    if (!response.ok) {
      const text = await response.text();
      console.error('Non-200 response:', text);
      
      // try to parse as JSON first, fallback to text
      let errorMessage;
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${text.slice(0, 100)}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    // check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      return {
        success: false,
        error: `Expected JSON, got: ${contentType}`
      };
    }

    const data = await response.json();
    console.log('Parsed JSON response:', data);
    return data;
    
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}