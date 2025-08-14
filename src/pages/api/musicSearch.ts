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
    // Import all dependencies directly here
    const [
      { ChatPromptTemplate },
      { ChatGoogleGenerativeAI },
      { StructuredOutputParser },
      { z }
    ] = await Promise.all([
      import("@langchain/core/prompts"),
      import("@langchain/google-genai"),
      import("langchain/output_parsers"),
      import("zod")
    ]);

    // Copy your schema from interpretPrompt.ts
      const schema = z.object({
        metadata: z.object({
          seed_artists: z.array(z.string()).optional(),
          seed_title: z.array(z.string()).optional()
        }),
        bounded_cols: z.object({
          danceability: z.string(),
          energy: z.string(),
          speechiness: z.string(),
          acousticness: z.string(),
          instrumentalness: z.string(),
          liveness: z.string(),
          valence: z.string()
        }),
        minmax_cols: z.object({
          tempo: z.string(),
          duration_ms: z.string(),
          time_signature: z.string(),
          key: z.string()
        }),
        zscore_cols: z.object({
          loudness: z.string()
        }),
        mode_cols: z.object({
          mode: z.string()
        })
      });

    const parser = StructuredOutputParser.fromZodSchema(schema);
    const formatInstructions = parser.getFormatInstructions();

    // Copy your prompt template
    const interpretPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a helpful assistant that finds songs similar to a certain seed (i.e., artist, album, song).
        
        This was the user's input: {userInput}

        Based on the user's input, translate it into a vector of Spotify song attributes. Do not worry about normalizing
        any of them. Include EVERY attribute; do NOT omit any attributes, including the metadata. Also do NOT include ranges; choose
        a singular numerical value for each attribute.

        {{
          "metadata": {{
            "seed_artists": [],
            "seed_title": []
          }},
          "bounded_cols": {{
              "danceability": string,
              "energy": string,
              "speechiness": string,
              "acousticness": string,
              "instrumentalness": string,
              "liveness": string,
              "valence": string
          }},
          "minmax_cols": {{
              "tempo": string,
              "duration_ms": string,
              "time_signature": string,
              "key": string
          }},
          "zscore_cols": {{
              "loudness": string
          }},
          "mode_cols": {{
              "mode": string
          }}
      }}

        Important rules:
        - Do NOT wrap the JSON in Markdown or backticks
        - Do NOT include any explanations or text outside the JSON
        - The output must be strictly valid JSON

        {formatInstructions}`],
      [
        "human",
        "{userInput}"
      ]
    ]);

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      temperature: 0,
      maxRetries: 2,
    });

    const chain = interpretPrompt.pipe(llm).pipe(parser);

    // Execute the chain
    const reccJSON = await chain.invoke({
      userInput,
      formatInstructions,
    });

    // Copy your reccToVector function or import it separately
    const reccVector = reccToVector(JSON.stringify(reccJSON));
    
    return reccVector;
    
  } catch (err) {
    console.error("API: Failed to interpret music input:", err);
    return null;
  }
}

export function reccToVector(jsonData: string): number[] {
  let parsed;

  try {
    parsed = JSON.parse(jsonData);
  } catch (error) {
    throw new Error(`Invalid JSON string provided: ${error}.`);
  }

  const vector: number[] = [];

  // bounded attributes
  const boundedKeys = [
    "danceability",
    "energy",
    "speechiness",
    "acousticness",
    "instrumentalness",
    "liveness",
    "valence",
    ];
  if (parsed) {
      boundedKeys.forEach((key) => {
      const val = parsed.bounded_cols[key];
      const num = Number(val);
      if (isNaN(num)) throw new Error(`Invalid number in bounded_cols: ${val}`);
      vector.push(num);
    });

    // min-max columns
    const minmaxKeys = ["tempo", "duration_ms", "time_signature", "key"];
    minmaxKeys.forEach((key) => {
      const val = parsed.minmax_cols[key];
      const num = Number(val);
      if (isNaN(num)) throw new Error(`Invalid number in minmax_cols: ${val}`);
      vector.push(num);
    });

    // z-score columns
    const zscoreKeys = ["loudness"];
    zscoreKeys.forEach((key) => {
      const val = parsed.zscore_cols[key];
      const num = Number(val);
      if (isNaN(num)) throw new Error(`Invalid number in zscore_cols: ${val}`);
      vector.push(num);
    });

    // mode columns
    const modeKeys = ["mode"];
    modeKeys.forEach((key) => {
      const val = parsed.mode_cols[key];
      const num = Number(val);
      if (isNaN(num)) throw new Error(`Invalid number in mode_cols: ${val}`);
      vector.push(num);
    });

    // corresponds to column order in chromadb
    const boundedIdx = [0, 1, 2, 3, 4, 5, 6];  // danceability → valence
    const minmaxIdx = [7, 8, 9, 10];           // tempo, duration_ms, time_signature, key
    const zscoreIdx = [11];                    // loudness
    const modeIdx: number[] = [12];            // mode

    // bounded
    const bounded = boundedIdx.map((i) => vector[i]);

    // min-max scaling
    const minmaxVals = minmaxIdx.map((i) => vector[i]);
    const min = Math.min(...minmaxVals);
    const max = Math.max(...minmaxVals);
    const minmax = minmaxVals.map((v) => (max - min === 0 ? 0.5 : (v - min) / (max - min)));

    // z-score scaling
    const zVals = zscoreIdx.map((i) => vector[i]);
    const mean = zVals.reduce((sum, v) => sum + v, 0) / zVals.length;
    const std = Math.sqrt(zVals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / zVals.length);
    const zscore = zVals.map((v) => (std === 0 ? 0 : (v - mean) / std));

    // mode columns (keep as is)
    const mode = modeIdx.map((i) => vector[i]);

    return [...bounded, ...minmax, ...zscore, ...mode];
  } else {
    return [0,0,0,0,0,0,0,0,0,0,0,0,0]; // SHOULD NEVER HAPPEN
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