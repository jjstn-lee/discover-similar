import 'server-only';

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";


// TEMP
import { GoogleGenAI } from "@google/genai";
const genAI = new GoogleGenAI({apiKey: process.env.GOOGLE_API_KEY});




import { z } from "zod";

const schema = z.object({
  song_titles: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  artists: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  albums: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  playlists: z.array(z.string().trim().min(1).max(200)).max(5).optional(),
  user_prompt: z.string().trim().min(1).max(2000),
});

const parser = StructuredOutputParser.fromZodSchema(schema);
const formatInstructions = parser.getFormatInstructions();

const extractPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a music metadata extraction specialist that parses user input to identify specific musical references and separate them from descriptive text.

    TASK:
    Analyze the user's input and extract any explicitly mentioned musical entities, then separate the remaining descriptive content as the user prompt.

    EXTRACTION CATEGORIES:
    - song_titles: Specific song names mentioned (e.g., "Bohemian Rhapsody", "Shape of You")
    - artists: Musician, band, or performer names (e.g., "The Beatles", "Taylor Swift", "Drake")
    - albums: Album or EP titles (e.g., "Abbey Road", "1989", "Thriller")
    - playlists: Named playlist references (e.g., "My Workout Mix", "Chill Vibes")
    - user_prompt: The descriptive/preference text after removing the above entities

    EXTRACTION GUIDELINES:
    - Only include items that are clearly identifiable as the specified categories
    - Use exact names/titles as mentioned by the user
    - Preserve original capitalization and spelling
    - For user_prompt: Include mood descriptions, genre preferences, activity contexts, and any other descriptive language
    - If the entire input is descriptive with no specific entities, put it all in user_prompt

    EXAMPLES OF WHAT TO EXTRACT:
    ✓ "I love songs like 'Blinding Lights' by The Weeknd" 
    → song_titles: ["Blinding Lights"], artists: ["The Weeknd"]
    ✓ "Suggest something similar to Taylor Swift's Folklore album"
    → artists: ["Taylor Swift"], albums: ["Folklore"]  
    ✓ "Upbeat pop music for working out"
    → user_prompt: "Upbeat pop music for working out"

    OUTPUT STRUCTURE:
    Return ONLY a valid JSON object with this exact structure:

    {{
        "song_titles": [],
        "artists": [], 
        "albums": [],
        "playlists": [],
        "user_prompt": "the entirety of the user's input here, INCLUDING metadata"
    }}

    CRITICAL REQUIREMENTS:
    - Output ONLY the JSON object - no markdown, backticks, explanations, or additional text
    - Omit any keys that have empty arrays or empty strings
    - Use double quotes for all strings and keys
    - Ensure proper JSON syntax (commas, brackets, quotes)
    - Arrays should contain strings only
    - If no entities are found, only include user_prompt with the full input

    {formatInstructions}`
  ],
  [
    "human",
    "{userInput}"
  ]
]);

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    maxRetries: 2,
});

export async function extractEntries(userInput: string) {
  try {
    const messages = await extractPrompt.formatMessages({
      userInput,
      formatInstructions,
    });

    const llmOutput = await llm.invoke(messages);

    let rawText = "";
    if (typeof llmOutput.content === "string") {
      rawText = llmOutput.content;
    } else if (Array.isArray(llmOutput.content)) {
      rawText = llmOutput.content
        .map(part => {
          if (typeof part === "string") {
            return part;
          } else if (part.type === "text") {
            return part.text;
          }
          return "";
        })
        .join(" ");
    }
    rawText = rawText.trim();

    const cleanedText = rawText.replace(/```json|```/g, "").trim();
    
    const result = await parser.parse(cleanedText);

    console.log("Parsed result:", result);
    return result;
  } catch (err) {
    console.error("Failed to parse or validate 'extractEntries' LLM response:", err);
    return null;
  }
}