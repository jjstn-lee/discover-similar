// Essential Spotify track metadata for music search and recommendations

export type SpotifyTrack = {
  // BASIC TRACK INFO (required for display)
  id: string;                    // Spotify track ID
  name: string;                  // Track title
  uri: string;                   // Spotify URI (spotify:track:...)
  href: string;                  // API endpoint for this track
  external_urls: {               // Links to Spotify
    spotify: string;             // Web player URL
  };
  
  // ARTIST INFO (essential)
  artists: Array<{
    id: string;
    name: string;
    uri: string;
    external_urls: { spotify: string };
  }>;
  
  // ALBUM INFO (important for context)
  album: {
    id: string;
    name: string;
    uri: string;
    album_type: string;          // "album", "single", "compilation"
    release_date: string;        // YYYY-MM-DD
    release_date_precision: string; // "year", "month", "day"
    total_tracks: number;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
    artists: Array<{             // Album artists (may differ from track artists)
      id: string;
      name: string;
    }>;
  };
  
  // TRACK PROPERTIES
  duration_ms: number;           // Track length in milliseconds
  explicit: boolean;             // Explicit content flag
  track_number: number;          // Track position on album
  disc_number: number;           // Disc number (for multi-disc albums)
  popularity: number;            // 0-100 popularity score
  preview_url?: string;          // 30-second preview URL (may be null)
  
  // MARKET/AVAILABILITY
  available_markets: string[];   // Country codes where track is available
  is_playable?: boolean;         // Whether track is playable in current market
  
  // AUDIO FEATURES (crucial for similarity matching)
  // These come from a separate API call to /audio-features/{id}
  audio_features: {
    acousticness: number;        // 0.0-1.0 (acoustic vs electric)
    danceability: number;        // 0.0-1.0 (how danceable)
    energy: number;              // 0.0-1.0 (intensity and power)
    instrumentalness: number;    // 0.0-1.0 (likelihood of no vocals)
    liveness: number;            // 0.0-1.0 (presence of audience)
    loudness: number;            // -60 to 0 dB (overall loudness)
    speechiness: number;         // 0.0-1.0 (presence of spoken words)
    valence: number;             // 0.0-1.0 (musical positivity)
    tempo: number;               // BPM (tempo in beats per minute)
    key: number;                 // 0-11 (pitch class, C=0, C#=1, etc.)
    mode: number;                // 0 or 1 (minor=0, major=1)
    time_signature: number;      // 3-7 (time signature)
    analysis_url?: string;       // URL for detailed audio analysis
  };
  
  // ADDITIONAL CONTEXT (optional but useful)
  genres?: string[];             // Genre tags (often from artist data)
  release_year?: number;         // Extracted from release_date for easy filtering
  decade?: string;               // "1980s", "1990s", etc. for decade filtering
  
  // COMPUTED FIELDS (for your recommendation engine)
  similarity_score?: number;     // Calculated similarity to search query
  matched_features?: string[];   // Which features contributed to the match
  playlist_context?: {           // If found in user playlists
    playlist_ids: string[];
    playlist_names: string[];
  };
};

// Helper functions for accessing metadata safely
export const getTrackTitle = (metadata: Record<string, unknown>): string => {
  return getMetadataString(metadata, 'name') || 
         getMetadataString(metadata, 'title') || 
         'Unknown Title';
};

export const getPrimaryArtist = (metadata: Record<string, unknown>): string => {
  const artists = getMetadataStringArray(metadata, 'artists');
  if (artists && artists.length > 0) {
    return artists[0];
  }
  
  const artistObjects = metadata.artists as any[];
  if (Array.isArray(artistObjects) && artistObjects.length > 0) {
    return artistObjects[0]?.name || 'Unknown Artist';
  }
  
  return getMetadataString(metadata, 'artist') || 'Unknown Artist';
};

export const getAlbumName = (metadata: Record<string, unknown>): string | undefined => {
  const album = metadata.album as any;
  if (album && typeof album === 'object') {
    return album.name;
  }
  return getMetadataString(metadata, 'album');
};

export const getAlbumArtUrl = (metadata: Record<string, unknown>): string | undefined => {
  const album = metadata.album as any;
  if (album?.images && Array.isArray(album.images) && album.images.length > 0) {
    // Return medium-sized image (usually index 1), fallback to first available
    return album.images[1]?.url || album.images[0]?.url;
  }
  return undefined;
};

export const getSpotifyUrl = (metadata: Record<string, unknown>): string | undefined => {
  const externalUrls = metadata.external_urls as any;
  return externalUrls?.spotify;
};

export const getAudioFeatures = (metadata: Record<string, unknown>) => {
  const features = metadata.audio_features as any;
  if (!features) return null;
  
  return {
    danceability: getMetadataNumber(features, 'danceability'),
    energy: getMetadataNumber(features, 'energy'),
    valence: getMetadataNumber(features, 'valence'),
    acousticness: getMetadataNumber(features, 'acousticness'),
    instrumentalness: getMetadataNumber(features, 'instrumentalness'),
    liveness: getMetadataNumber(features, 'liveness'),
    speechiness: getMetadataNumber(features, 'speechiness'),
    loudness: getMetadataNumber(features, 'loudness'),
    tempo: getMetadataNumber(features, 'tempo'),
    key: getMetadataNumber(features, 'key'),
    mode: getMetadataNumber(features, 'mode'),
    time_signature: getMetadataNumber(features, 'time_signature'),
  };
};

export const getTrackDuration = (metadata: Record<string, unknown>): string => {
  const durationMs = getMetadataNumber(metadata, 'duration_ms');
  if (!durationMs) return 'Unknown';
  
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const getReleaseYear = (metadata: Record<string, unknown>): number | undefined => {
  const album = metadata.album as any;
  const releaseDate = album?.release_date || getMetadataString(metadata, 'release_date');
  
  if (releaseDate) {
    const year = parseInt(releaseDate.substring(0, 4));
    return isNaN(year) ? undefined : year;
  }
  
  return undefined;
};

export const getPopularityScore = (metadata: Record<string, unknown>): number | undefined => {
  return getMetadataNumber(metadata, 'popularity');
};

// Utility functions you already have
const getMetadataString = (metadata: Record<string, unknown>, key: string): string | undefined => {
  const value = metadata[key];
  return typeof value === 'string' ? value : undefined;
};

const getMetadataNumber = (metadata: Record<string, unknown>, key: string): number | undefined => {
  const value = metadata[key];
  return typeof value === 'number' ? value : undefined;
};

const getMetadataStringArray = (metadata: Record<string, unknown>, key: string): string[] | undefined => {
  const value = metadata[key];
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;
};