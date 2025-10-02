// takes result from Spotify search on extractAgent's parsed JSON and tweaks it based on the user's input.

import 'server-only';

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

// zod schema to validate JSON returned by LLM
const schema = z.object({
  metadata: z.object({
    seed_artists: z.array(z.string()).optional(),
    seed_title: z.array(z.string()).optional()
  }).optional(), // Made optional since the prompt doesn't generate this
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
export const formatInstructions = parser.getFormatInstructions();

const interpretPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a music analysis assistant that interprets user preferences and adjusts Spotify audio feature parameters accordingly.
    
    CONTEXT:
    Original seed attributes: {seedAttributes}
    User's musical preference/description: {userInput}

    TASK:
    Analyze the user's input and intelligently adjust the seed attributes to better match their described preferences. Consider how each audio feature contributes to the overall musical experience the user is seeking.

    AUDIO FEATURE GUIDANCE:
    - danceability (0.0-1.0): How suitable a track is for dancing
    - energy (0.0-1.0): Perceptual measure of intensity and power
    - speechiness (0.0-1.0): Presence of spoken words (>0.66 = speech, 0.33-0.66 = rap/spoken word, <0.33 = music)
    - acousticness (0.0-1.0): Confidence measure of whether the track is acoustic
    - instrumentalness (0.0-1.0): Predicts whether a track contains no vocals
    - liveness (0.0-1.0): Detects the presence of an audience in the recording
    - valence (0.0-1.0): Musical positiveness (high = happy/euphoric, low = sad/angry)
    - tempo: Beats per minute (typical range: 60-200 BPM)
    - duration_ms: Track length in milliseconds
    - time_signature: Time signature (3-7, most common is 4)
    - key: Musical key (0-11, where 0=C, 1=C#, etc.)
    - loudness: Overall loudness in decibels (typically -60 to 0)
    - mode: Major (1) or minor (0) key

    {formatInstructions}`
  ],
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
 * @param seedAttributes - Original seed attributes to base adjustments on
 * @returns Promise<number[] | null> - The interpreted vector or null if failed
 */
export async function interpretMusic(
  userInput: string, 
  seedAttributes?: string
): Promise<number[] | null> {
  try {
    const reccJSON = await chain.invoke({
      userInput,
      seedAttributes: seedAttributes || "No seed attributes provided",
      formatInstructions,
    });
    
    console.log("Interpreted music attributes:", reccJSON);
    
    const reccVector = tweakVector(JSON.stringify(reccJSON));
    console.log("Generated vector:", reccVector);
    
    return reccVector;
    
  } catch (err) {
    console.error("Failed to parse or validate 'interpretMusic' LLM response:", err);
    return null;
  }
}

// parses recommendation JSON from LLM and turns it into a normalized vector
export function tweakVector(jsonData: string): number[] {
  let parsed;

  try {
    parsed = JSON.parse(jsonData);
  } catch (error) {
    throw new Error(`Invalid JSON string provided: ${error}`);
  }

  if (!parsed) {
    throw new Error("Parsed JSON is null or undefined");
  }

  // Validate required structure
  if (!parsed.bounded_cols || !parsed.minmax_cols || !parsed.zscore_cols || !parsed.mode_cols) {
    throw new Error("Missing required JSON structure in parsed data");
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
    if (val === undefined || val === null) {
      throw new Error(`Missing bounded_cols key: ${key}`);
    }
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Invalid number in bounded_cols.${key}: ${val}`);
    if (num < 0 || num > 1) throw new Error(`Bounded value out of range [0,1] for ${key}: ${num}`);
    vector.push(num);
  });

  // min-max columns
  const minmaxKeys = ["tempo", "duration_ms", "time_signature", "key"];
  minmaxKeys.forEach((key) => {
    const val = parsed.minmax_cols[key];
    if (val === undefined || val === null) {
      throw new Error(`Missing minmax_cols key: ${key}`);
    }
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Invalid number in minmax_cols.${key}: ${val}`);
    vector.push(num);
  });

  // z-score columns
  const zscoreKeys = ["loudness"];
  zscoreKeys.forEach((key) => {
    const val = parsed.zscore_cols[key];
    if (val === undefined || val === null) {
      throw new Error(`Missing zscore_cols key: ${key}`);
    }
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Invalid number in zscore_cols.${key}: ${val}`);
    vector.push(num);
  });

  // mode columns
  const modeKeys = ["mode"];
  modeKeys.forEach((key) => {
    const val = parsed.mode_cols[key];
    if (val === undefined || val === null) {
      throw new Error(`Missing mode_cols key: ${key}`);
    }
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Invalid number in mode_cols.${key}: ${val}`);
    if (num !== 0 && num !== 1) throw new Error(`Mode must be 0 or 1, got: ${num}`);
    vector.push(num);
  });

  // Validate vector length
  if (vector.length !== 13) {
    throw new Error(`Expected vector length 13, got ${vector.length}`);
  }

  // corresponds to column order in chromadb
  const boundedIdx = [0, 1, 2, 3, 4, 5, 6];  // danceability → valence
  const minmaxIdx = [7, 8, 9, 10];           // tempo, duration_ms, time_signature, key
  const zscoreIdx = [11];                    // loudness
  const modeIdx = [12];                      // mode

  // bounded (already normalized 0-1)
  const bounded = boundedIdx.map((i) => vector[i]);

  // min-max scaling
  const minmaxVals = minmaxIdx.map((i) => vector[i]);
  
  // Handle edge cases for min-max scaling
  if (minmaxVals.length === 0) {
    throw new Error("No minmax values to scale");
  }
  
  let minmax: number[];
  if (minmaxVals.length === 1) {
    // If only one value, normalize to 0.5
    minmax = [0.5];
  } else {
    const min = Math.min(...minmaxVals);
    const max = Math.max(...minmaxVals);
    minmax = minmaxVals.map((v) => (max - min === 0 ? 0.5 : (v - min) / (max - min)));
  }

  // z-score scaling
  const zVals = zscoreIdx.map((i) => vector[i]);
  
  // Handle edge cases for z-score scaling
  let zscore: number[];
  if (zVals.length === 0) {
    zscore = [];
  } else if (zVals.length === 1) {
    // If only one value, z-score is 0
    zscore = [0];
  } else {
    const mean = zVals.reduce((sum, v) => sum + v, 0) / zVals.length;
    const variance = zVals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / zVals.length;
    const std = Math.sqrt(variance);
    zscore = zVals.map((v) => (std === 0 ? 0 : (v - mean) / std));
  }

  // mode columns (keep as is, already 0 or 1)
  const mode = modeIdx.map((i) => vector[i]);

  const finalVector = [...bounded, ...minmax, ...zscore, ...mode];
  
  // Final validation
  if (finalVector.length !== 13) {
    throw new Error(`Final vector length mismatch. Expected 13, got ${finalVector.length}`);
  }

  return finalVector;
}