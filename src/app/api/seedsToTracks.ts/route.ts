// take in result tuple from searchSeeds
// return list of spotify tracks

import { ResultTuple, SpotifyArtist } from "@/types/interfaces";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function seedsToTracks(resultTuple: ResultTuple): Promise<string[]> {
    console.log("=====in seedsToTrack API route=====")
    // set LIMIT for all searches
    const limit = 5;

    // auth boilerplate
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
        throw new Error('No access token available');
    }
    
    const accessToken = session.accessToken as string;

    // deconstruct resultTuple
    const results = resultTuple[0];
    const userPrompt = resultTuple[1];
    
    // list of tracks that finally get returned
    const trackIds: string[] = [];

    // loop through artists and grab the most popular songs
    console.log("looping through artists")
    const artistIds = results.artists.map((a) => a.id);
    const artistResponses = await Promise.all(
        artistIds.map((id) =>
            fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
        )
    );
    console.log(`len of artistResponses: ${artistResponses.length}`)
    for (const res of artistResponses) {
        const data = await res.json();
        const topTracks = data.tracks?.slice(0, limit) || [];
        for (const track of topTracks) {
            console.log(`adding ${track.name}`)
            trackIds.push(track.id);
        }
    } 

    // loop through playlists and add [limit # of tracks] to trackIds
    console.log("looping through playlists")
    const playlistIds = results.playlists.map((p) => p.id);
    const playlistResponses = await Promise.all(
        playlistIds.map((id) =>
            fetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=${limit}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
        )
    )
    for (const res of playlistResponses) {
        const data = await res.json();
        const playlistTracks = data.tracks?.slice(0, limit) || [];

        for (const item of playlistTracks) {
            const track = item.track;
            
            if (track?.id) {
                console.log(`adding ${track.name}`)
                trackIds.push(track.id);
            }
        }
    }

    // loop through albums and add [limit # of tracks] to trackIds
    console.log("looping through albums")
    const albumIds = results.albums.map((a) => a.id);
    const albumResponses = await Promise.all(
        albumIds.map((id) =>
            fetch(`https://api.spotify.com/v1/albums/${id}/tracks?limit=${limit}`, {
                headers: { Authorization: `Bearer ${accessToken}`},
            })
        )
    )
    for (const res of albumResponses) {
        const data = await res.json();
        const playlistTracks = data.tracks?.slice(0, limit) || [];

        for (const item of playlistTracks) {
            const track = item.track;
            if (track?.id) {
                console.log(`adding ${track.name}`)
                trackIds.push(track.id)
            }
        }
    }

    return trackIds;



}