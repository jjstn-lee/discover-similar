// module to call Spotify API
export function buildSpotifySearchQueries(entries: any[]): { q: string; type: string }[] {
    return entries.map(entry => {
        let qParts: string[] = [];
        let type = "track"; // Default to track

        if (entry.song_title) {
            qParts.push(`track:${entry.song_title}`);
            type = "track";
        }

        if (entry.artist) {
            qParts.push(`artist:${entry.artist}`);
            if (!entry.song_title && !entry.album) {
                type = "artist";
            }
        }

        if (entry.album) {
            qParts.push(`album:${entry.album}`);
            if (!entry.song_title && !entry.artist) {
                type = "album";
            }
        }

        return {
            q: qParts.join(" "),
            type
        };
    });
}

// function that uses Spotify's "v1/search?" API endpoint in order to grab Spotify IDs of songs later to be passed to Reccobeat API
export async function spotifySearch(entries: [], accessToken: string): Promise<any[]> {
    const queries = buildSpotifySearchQueries(entries);
    console.log("in spotifySearch(), queries: ", queries)
    const results = [];

    for (const { q, type } of queries) {
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=1`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const text = await res.text();
        if (!res.ok) {
            let errorData;
            try {
                errorData = JSON.parse(text);
            } catch {
                errorData = { message: text || "Unknown error from Spotify" };
            }
            console.error('Spotify API response status:', res.status);
            console.error('Spotify API response text:', text);
            throw new Error(JSON.stringify(errorData));
        }

        const json = JSON.parse(text);
        const item = json[`${type}s`]?.items?.[0];
        results.push({
            type,
            query: q,
            id: item?.id ?? null,
            name: item?.name ?? null,
        });
    }
    console.log("in spotifySearch(), results:", results);
    return results;
}

// Function that loops through the 'results' array.
// If it is a track, then 