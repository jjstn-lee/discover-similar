import { ChatPromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { searchSimilarVectors } from "@/lib/chromadb/cosine_similarity";
import { z } from "zod";

// zod schema to validaate JSON returned by LLM
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

type MusicSeedData = {
  seed_artists: string[];
  seed_genres: string[];
  seed_tracks: string[];
  attribute_vector: (number | string)[];
};


const parser = StructuredOutputParser.fromZodSchema(schema);
export const formatInstructions = parser.getFormatInstructions();

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

export const chain = interpretPrompt.pipe(llm).pipe(parser);

/**
 * Modified version of interpretMusic that returns the vector instead of logging results
 * @param userInput - Natural language description
 * @returns Promise<number[] | null> - The interpreted vector or null if failed
 */
export async function interpretMusic(userInput: string): Promise<number[] | null> {
  try {
    // Copy your existing interpretMusic logic here, but return the vector
    const reccJSON = await chain.invoke({
      userInput,
      formatInstructions,
    });
    
    console.log("Interpreted music attributes:", reccJSON);
    
    const reccVector = reccToVector(JSON.stringify(reccJSON));
    console.log("Generated vector:", reccVector);
    
    return reccVector;
    
  } catch (err) {
    console.error("Failed to parse or validate 'interpretMusic' LLM response:", err);
    return null;
  }
}

// parses recommendation JSON from LLM and turns it into a normalized vector
export function reccToVector(jsonData: string): number[] {
  let parsed: any;

  try {
    parsed = JSON.parse(jsonData);
  } catch (error) {
    throw new Error("Invalid JSON string provided.");
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
}

