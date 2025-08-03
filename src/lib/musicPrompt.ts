import { ChatPromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { GoogleGenAI } from "@google/genai";

import { z } from "zod";

const musicPrompt = ChatPromptTemplate.fromPromptMessages([
  HumanMessagePromptTemplate.fromTemplate(`
    The user wants music like "{seed_artist}" but describes it as: "{user_input}"

    Translate this into:
    1. Spotify audio features (valence, tempo, energy, instrumentalness)
    2. Genre or mood tags
    3. Vocal characteristics

    Respond in JSON:
    {{
        "valence": "lower",
        "tempo": "slower",
        "energy": "lower",
        "instrumentalness": "higher",
        "mood_tags": [],
        "vocal_style": ""
    }}
    `)
]);

const model = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const chain = new LLMChain({
    llm: model,
    prompt: musicPrompt,
})

export async function interpretMusicPrompt(userInput: string, seedArtist: string) {
    const result = await chain.call({
        user_input: userInput,
        seed_artist: seedArtist,
    });

    // validate JSON shape via Zod
    const schema = z.object({
        valence: z.string(),
        tempo: z.string(),
        energy: z.string(),
        instrumentalness: z.string(),
        mood_tags: z.array(z.string()),
        vocal_style: z.string(),
    });

    try {
        const parsed = JSON.parse(result.text);
        return schema.parse(parsed);
    } catch (err) {
        console.error("Failed to parse or validate LLM response:", result.text);
        return null;
  }
}