// abstracted interfaces to help orchestrator/maintain not-dogshit comms b/w agents

export type ResultTuple = [searchSeedsResult, string];

export interface SearchParams {
    song_titles: string[];
    artists: string[];
    albums: string[];
    playlists: string[];
    user_prompt: string;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    artists: { name: string; id: string }[];
    album: { name: string; id: string };
    uri: string;
    external_urls: { spotify: string };
}

export interface SpotifyArtist {
    id: string;
    name: string;
    uri: string;
    external_urls: { spotify: string };
    genres: string[];
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    artists: { name: string; id: string }[];
    uri: string;
    external_urls: { spotify: string };
    release_date: string;
}

export interface SpotifyPlaylist {
    id: string;
    name: string;
    owner: { display_name: string };
    uri: string;
    external_urls: { spotify: string };
    tracks: { total: number };
}

export interface searchSeedsResult {
    tracks: SpotifyTrack[];
    artists: SpotifyArtist[];
    albums: SpotifyAlbum[];
    playlists: SpotifyPlaylist[];
}