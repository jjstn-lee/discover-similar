import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";

import { z } from "zod";

const entrySchema = z.object({
  song_title: z.string().optional(),
  artist: z.string().optional(),
  album: z.string().optional(),
}).refine(
  (data) => data.song_title || data.artist || data.album,
  {
    message: "At least one of song_title, artist, or album must be provided.",
  }
);

const schema = z.object({
  entries: z.array(entrySchema).min(1, "At least one entry is required")
});

const parser = StructuredOutputParser.fromZodSchema(schema);
const formatInstructions = parser.getFormatInstructions();

const extractPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant that only extracts metadata from a user's input.

    Possible values for metadata:
    1. Song Title
    2. Artist/Band
    3. Album
    
    Return ONLY a raw JSON object with this exact structure. Each item should be an object in the "entries" array. 
    Each object must contain at least one of the following keys: "song_title", "artist", or "album". 
    Empty or unknown values should be omitted.

    Important rules:
    - Do NOT wrap the JSON in Markdown or backticks
    - Do NOT include any explanations or text outside the JSON
    - The output must be strictly valid JSON
    - Each entry should have string values, not arrays

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