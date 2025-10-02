import 'server-only';

// orchestrator responsible for coordinating entire workflow

import { SpotifyTrack } from '@/types/spotifyTrack';
import { extractEntries } from '@/lib/ai/extractAgent';
import { tweakVector } from '@/lib/ai/tweakerAgent';

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
    console.log('Extracted entries:', extractedData);


    // 2. spotify search on the seed(s); if they return nothing, then don't do anything

    
    // 3. call the seedTweaker on the spotify search result


    // 4. take tweaked seed vector and call recco reccomendations endpoint








    return DiscoverResults; // placeholder
}