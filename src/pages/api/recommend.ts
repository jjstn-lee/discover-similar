// /pages/api/recommend.ts

import { NextApiRequest, NextApiResponse } from "next";
import SpotifyWebApi from "spotify-web-api-node";

// Your configured instance (you should ideally store refreshToken/token securely)
const getSpotifyApi = (accessToken: string) => {
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  return spotifyApi;
};

type InputType = "track" | "artist" | "playlist" | "unknown";

// Util: Determine input type
const determineInputType = (input: string): InputType => {
  const trackRegex = /track\/([a-zA-Z0-9]+)/;
  const artistRegex = /artist\/([a-zA-Z0-9]+)/;
  const playlistRegex = /playlist\/([a-zA-Z0-9]+)/;

  if (trackRegex.test(input)) return "track";
  if (artistRegex.test(input)) return "artist";
  if (playlistRegex.test(input)) return "playlist";
  return "unknown";
};

const extractSpotifyId = (input: string): string | null => {
  const match = input.match(/(track|artist|playlist)\/([a-zA-Z0-9]+)/);
  return match ? match[2] : null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { input, accessToken } = req.body;

  if (!input || !accessToken) {
    return res.status(400).json({ error: "Missing input or access token" });
  }

  const spotifyApi = getSpotifyApi(accessToken);
  const type = determineInputType(input);
  const id = extractSpotifyId(input);

  if (type === "unknown" || !id) {
    return res.status(400).json({ error: "Unable to parse input" });
  }

  let seedOptions: { seed_tracks?: string[]; seed_artists?: string[] } = {};

  if (type === "track") {
    seedOptions.seed_tracks = [id];
  } else if (type === "artist") {
    seedOptions.seed_artists = [id];
  } else if (type === "playlist") {
    // Extract top 5 tracks from playlist
    try {
      const playlistTracks = await spotifyApi.getPlaylistTracks(id, { limit: 5 });
      const trackIds = playlistTracks.body.items
        .map((item) => item.track?.id)
        .filter(Boolean);
      seedOptions.seed_tracks = trackIds.slice(0, 5);
    } catch (e) {
      return res.status(500).json({ error: "Failed to read playlist" });
    }
  }

  try {
    // Get recommended tracks
    const recommendations = await spotifyApi.getRecommendations({
      ...seedOptions,
      limit: 20,
    });

    // Get user's saved tracks (known)
    const savedTracksData = await spotifyApi.getMySavedTracks({ limit: 50 });
    const knownTrackIds = savedTracksData.body.items.map((item) => item.track.id);

    // Filter out known tracks
    const filtered = recommendations.body.tracks.filter(
      (track) => !knownTrackIds.includes(track.id)
    );

    return res.status(200).json({ recommendations: filtered });
  } catch (err) {
    console.error("Error getting recommendations:", err);
    return res.status(500).json({ error: "Failed to get recommendations" });
  }
}
