import type { NextApiRequest, NextApiResponse } from "next";
import { interpretMusic } from "@/lib/interpretPrompt";
import { buildSpotifySearchQueries, spotifySearch } from "@/lib/spotifySearch";
import { extractEntries } from "@/lib/extractPrompt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
// import recommendationSchema from "@/lib/recommendationSchema";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.accessToken) {
        return res.status(401).json({ error: "Unauthorized" });
    }


    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const userInput = req.body;

    if (!userInput) {
        return res.status(400).json({ error: "Missing input" });
    }

    let entriesJSON;
    try {
        entriesJSON = await extractEntries(userInput);
    } catch(err) {
        console.error("Failed to retrieve LLM response (conversion from userInput->JSON:", err);
    }

    try {
        // const validated = recommendationSchema.parse(songJSON);
        console.log("in get-recommendations in try-catch, userInput: ", userInput)
        console.log("in get-recommendations in try-catch, entries: ", entriesJSON)

        const entriesJSONstring = JSON.stringify(entriesJSON);
        const entries = JSON.parse(entriesJSONstring).entries;

        console.log("in get-recommendations in try-catch, entries: ", entries)

        const recommendations = await spotifySearch(
            // validated,
            entries,
            session.accessToken
        );
        res.status(200).json({ recommendations });

        console.log(recommendations);
    } catch (err) {
        console.error("Failed to get recommendations:", err);
        res.status(400).json({ error: "Invalid input or Spotify error" });
    }
}