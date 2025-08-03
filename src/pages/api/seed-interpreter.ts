import type { NextApiRequest, NextApiResponse } from "next";
import { interpretMusicPrompt } from "@/lib/musicPrompt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { userInput, seedArtist } = req.body;

    if (!userInput || !seedArtist) {
        return res.status(400).json({ error: "Missing input" });
    }

    try {
        const interpretation = await interpretMusicPrompt(userInput, seedArtist);

        if (!interpretation) {
            return res.status(500).json({ error: "Failed to interpret prompt" });
        }

        return res.status(200).json(interpretation)
    } catch (err: any) {
        console.error("LLM interpretation error: ", err);
        return res.status(500).json({ error: "Internal server error" })
    }
}