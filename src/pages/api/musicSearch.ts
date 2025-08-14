import type { NextApiRequest, NextApiResponse } from "next";
import { searchSimilarVectors } from "@/lib/chromadb/cosine_similarity";

type SearchResult = {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
};

type MusicSearchResponse = {
  success: boolean;
  results?: SearchResult[];
  error?: string;
};

/**
 * function that orchestrates the music search process; simpler for frontend
 */
async function searchSimilarMusic(
  userInput: string,
  limit: number = 5
): Promise<MusicSearchResponse> {
  try {
    if (!userInput || userInput.trim().length === 0) {
      return {
        success: false,
        error: "User input cannot be empty"
      };
    }

    console.log(`API: Processing search for: "${userInput}"`);

    const interpretedResult = await interpretMusicAndReturnVector(userInput);
    
    if (!interpretedResult) {
      return {
        success: false,
        error: "Failed to interpret user input into music attributes, most likely hit quota for LLM"
      };
    }

    console.log("API: Generated vector:", interpretedResult);

    const searchResults = await searchSimilarVectors(interpretedResult, limit);
    
    console.log(`API: Found ${searchResults.length} similar songs`);

    return {
      success: true,
      results: searchResults
    };

  } catch (error) {
    console.error("API: Error in searchSimilarMusic:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * wrapper for interpretMusic function that returns the vector
 */
async function interpretMusicAndReturnVector(userInput: string): Promise<number[] | null> {
  try {
    // Import your existing chain and functions
    const { chain, formatInstructions, reccToVector } = await import("@/lib/interpretPrompt");
    
    // Use your existing LangChain chain
    const reccJSON = await chain.invoke({
      userInput,
      formatInstructions,
    });
    
    console.log("API: Interpreted music attributes:", reccJSON);
    
    // Use your existing reccToVector function
    const reccVector = reccToVector(JSON.stringify(reccJSON));
    console.log("API: Generated vector:", reccVector);
    
    return reccVector;
    
  } catch (err) {
    console.error("API: Failed to interpret music input:", err);
    return null;
  }
}

// API route handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MusicSearchResponse>
) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { userInput, limit = 5 } = req.body;

    // validation
    if (!userInput) {
      return res.status(400).json({
        success: false,
        error: 'userInput is required'
      });
    }

    if (typeof userInput !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'userInput must be a string'
      });
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 50) {
      return res.status(400).json({
        success: false,
        error: 'limit must be a number between 1 and 50'
      });
    }

    console.log('API: Received request - userInput:', userInput, 'limit:', limit);

    // call orchestrator search function
    const result = await searchSimilarMusic(userInput, limit);

    // Return appropriate response
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('API: Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
}