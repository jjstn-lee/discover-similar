// passed-in JSON will have the following structure:
// 
// {
//   song_titles: [],
//   artists: [ 'SZA' ],
//   albums: [],
//   playlists: [],
//   user_prompt: 'sadder',
// }

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { SearchParams, SpotifyTrack, SpotifyArtist, SpotifyPlaylist, ResultTuple, searchSeedsResult } from "@/types/interfaces";

const scopes = [
  "user-read-email",
  "user-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export interface SpotifyRequestOptions extends RequestInit {
  endpoint: string; // e.g. "me/playlists" or "search?q=radiohead&type=artist"
  accessToken?: string; // optional, can be read from cookies
}



// Helper to clean and format search queries
function cleanQuery(query: string): string {
    return query
        .trim()
        .replace(/[^\w\s:'-]/g, '') // Remove special chars except hyphens and apostrophes
        .replace(/\s+/g, ' '); // Normalize whitespace
}

// Helper to deduplicate results by ID
function deduplicateById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

// performs search via Spotify Web API
export async function searchSeeds(searchParams: any): Promise<ResultTuple> {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
        throw new Error('No access token available');
    }
    
    const accessToken = session.accessToken as string;
    
    // Debug logging
    console.log('Session exists:', !!session);
    console.log('Access token exists:', !!accessToken);
    console.log('Access token (first 20 chars):', accessToken?.substring(0, 20));

    // simple typecast to interface; kinda unelegant but w/e, not a biggie
    const params = searchParams as SearchParams;

    const results: searchSeedsResult = {
        tracks: [],
        artists: [],
        albums: [],
        playlists: []
    };

    const baseUrl = 'https://api.spotify.com/v1/search';
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };

    // Helper function to perform a search
    async function performSearch(query: string, type: string): Promise<any> {
        console.log('Original query:', query);
        const cleanedQuery = cleanQuery(query);
        console.log('Cleaned query:', cleanedQuery);
        
        if (!cleanedQuery) {
            console.warn(`Empty query after cleaning: "${query}"`);
            return null;
        }

        // Manually encode the query to ensure field filters (like artist:) are properly encoded
        
        const params = new URLSearchParams({
            q: cleanedQuery,
            type: type,
            limit: '5'
        });
        
        console.log('Fetching...:', `${baseUrl}?${params}`)

        try {
            const response = await fetch(`${baseUrl}?${params}`, { headers });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Spotify API error for query "${cleanedQuery}": ${response.status} ${response.statusText}`);
                console.error('Error body:', errorBody);
                
                if (response.status === 401) {
                    console.error('Token may be expired or invalid. Token prefix:', accessToken.substring(0, 20));
                }
                
                return null;
            }

            return response.json();
        } catch (error) {
            console.error(`Network error for query "${cleanedQuery}":`, error);
            return null;
        }
    }

    // Search for tracks (songs)
    // Use track: prefix for more accurate results
    for (const songTitle of params.song_titles) {
        if (!songTitle.trim()) continue;

        const query = `track:${songTitle}`;
        const data = await performSearch(query, 'track');
        if (data?.tracks?.items) {
            results.tracks.push(...data.tracks.items.map((track: any) => ({
                id: track.id,
                name: track.name,
                artists: track.artists.map((a: any) => ({ name: a.name, id: a.id })),
                album: { name: track.album.name, id: track.album.id },
                uri: track.uri,
                external_urls: track.external_urls
            })));
        }
    }

    // Search for artists
    // Use artist: prefix for more accurate results
    for (const artist of params.artists) {
        if (!artist.trim()) continue;

        console.log("Searching for artist: %s", artist);

        const query = `artist:${artist}`;
        const data = await performSearch(query, 'artist');
        if (data?.artists?.items) {
            results.artists.push(...data.artists.items.map((a: any) => ({
                id: a.id,
                name: a.name,
                uri: a.uri,
                external_urls: a.external_urls,
                genres: a.genres || []
            })));
        }
    }

    // Search for albums
    // Use album: prefix for more accurate results
    for (const album of params.albums) {
        if (!album.trim()) continue;

        const query = `album:${album}`;
        const data = await performSearch(query, 'album');
        if (data?.albums?.items) {
            results.albums.push(...data.albums.items.map((alb: any) => ({
                id: alb.id,
                name: alb.name,
                artists: alb.artists.map((a: any) => ({ name: a.name, id: a.id })),
                uri: alb.uri,
                external_urls: alb.external_urls,
                release_date: alb.release_date
            })));
        }
    }

    // Search for playlists
    // Playlists don't support field filters, use plain search
    for (const playlist of params.playlists) {
        if (!playlist.trim()) continue;

        const data = await performSearch(playlist, 'playlist');
        if (data?.playlists?.items) {
            results.playlists.push(...data.playlists.items.map((pl: any) => ({
                id: pl.id,
                name: pl.name,
                owner: { display_name: pl.owner.display_name },
                uri: pl.uri,
                external_urls: pl.external_urls,
                tracks: { total: pl.tracks.total }
            })));
        }
    }

    // Deduplicate results
    results.tracks = deduplicateById(results.tracks);
    results.artists = deduplicateById(results.artists);
    results.albums = deduplicateById(results.albums);
    results.playlists = deduplicateById(results.playlists);

    // Log summary of results
    console.log('Search complete:', {
        tracks: results.tracks.length,
        artists: results.artists.length,
        albums: results.albums.length,
        playlists: results.playlists.length
    });
    
    if (results.artists.length > 0) {
        console.log('Found artists:', results.artists.map(a => a.name).join(', '));
    }

    const artists: SpotifyArtist[] = []
    for (const artist of results.artists) {
        if (params.artists.some(param => param.toLowerCase() === artist.name.toLowerCase())) {
            artists.push(artist);
        }
    }
    results.artists = artists;

    // Return results as a tuple with the user prompt
    return [results, params.user_prompt];
}