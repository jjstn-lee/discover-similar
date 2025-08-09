import { ChatPromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

// zod schema to validaate JSON returned by LLM
const schema = z
  .object({
    seed_artists: z.array(z.string()).optional(),
    seed_genres: z.array(z.string()).optional(),
    seed_tracks: z.array(z.string()).optional(),

    target_acousticness: z.number().min(0).max(1),
    target_danceability: z.number().min(0).max(1),
    target_duration_ms: z.number(),
    target_energy: z.number().min(0).max(1),
    target_instrumentalness: z.number().min(0).max(1),
    target_key: z.number().int().min(0).max(11),
    target_liveness: z.number().min(0).max(1),
    target_loudness: z.number(),
    target_mode: z.number().int().min(0).max(1),
    target_popularity: z.number().int().min(0).max(100),
    target_speechiness: z.number().min(0).max(1),
    target_valence: z.number().min(0).max(1),
  })
  .refine(
    (data) =>
      (data.seed_artists && data.seed_artists.length > 0) ||
      (data.seed_genres && data.seed_genres.length > 0) ||
      (data.seed_tracks && data.seed_tracks.length > 0),
    {
      message:
        "At least one of seed_artists, seed_genres, or seed_tracks must be provided.",
    }
)

const parser = StructuredOutputParser.fromZodSchema(schema);
const formatInstructions = parser.getFormatInstructions();

const interpretPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant that finds songs similar to a certain seed (i.e., artist, album, song). Based
    on the user's input, translate it into the following:

    Translate this into:
    1. Spotify audio features (valence, tempo, energy, instrumentalness)
    2. Genre or mood tags
    3. Vocal characteristics

    
    Return ONLY a raw JSON object with this exact structure, and at least one of seed_artists, seed_genres, or
    seed_tracks must be included in the JSON (the others may be empty or omitted):
    {{
        valence: string,
        tempo: string,
        energy: string,
        instrumentalness: string,
        mood_tags: string[],
        vocal_style: string
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

export async function interpretMusic(userInput: string) {
    try {
        const result = await chain.invoke({
            userInput,
            formatInstructions,
        });
        console.log(result)
        return result;
    } catch (err) {
        console.error("Failed to parse or validate 'interpretMusic' LLM response:", err);
        return null;
    }
}