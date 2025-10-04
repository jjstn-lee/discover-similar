import 'server-only';

// orchestrator responsible for coordinating entire workflow

import { SpotifyTrack } from '@/types/spotifyTrack';
import { extractEntries } from '@/lib/ai/extractAgent';
import { tweakVector } from '@/lib/ai/tweakerAgent';
import { searchSeeds } from '@/app/api/searchSeeds/route';

export type DiscoverResults = {
  success: boolean;
  tracks?: SpotifyTrack[],
  error?: string;
};

export async function discover(
    userInput: string,
    limit: number = 5
): Promise<DiscoverResults> {

    const DiscoverResults = { // placeholder
        success: true, 
        links: [],
        error: "",
    }
    // 1. call extract on userinput
    const extractedData = await extractEntries(userInput);
    console.log('Extracted entries: ', extractedData);
    console.log('validate JSON: ', validateExtractedData(extractedData))

    // 2. search for the extracted seeds via spotify web api
    const searchResults = await searchSeeds(extractedData);
    console.log('searchResults: ', searchResults);



    return DiscoverResults; // placeholder
}

function validateExtractedData(obj: any) {
    return (
        typeof obj === "object" && obj !== null &&
        Array.isArray(obj.song_titles) &&
        obj.song_titles.every((s: any) => typeof s === "string") &&
        Array.isArray(obj.artists) &&
        obj.artists.every((s: any) => typeof s === "string") &&
        Array.isArray(obj.albums) &&
        obj.albums.every((s: any) => typeof s === "string") &&
        Array.isArray(obj.playlists) &&
        obj.playlists.every((s: any) => typeof s === "string") &&
        typeof obj.user_prompt === "string"
    );
}