// Token storage schema
export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Date.now() + expires_in * 1000
}

// Spotify API error body
export interface SpotifyErrorBody {
  error: {
    status: number;
    message: string;
  };
}

// Devices
export interface SpotifyDevice {
  id: string | null;
  name: string;
  type: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  volume_percent: number | null;
  supports_volume: boolean;
}

export interface GetDevicesResponse {
  devices: SpotifyDevice[];
}

// Artists
export interface SpotifyArtistSimple {
  id: string;
  name: string;
  uri: string;
}

// Album image
export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

// Album (simplified for playback)
export interface SpotifyAlbumSimple {
  id: string;
  name: string;
  uri: string;
  images: SpotifyImage[];
}

// Track (as returned in playback state)
export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  type: 'track';
  duration_ms: number;
  explicit: boolean;
  artists: SpotifyArtistSimple[];
  album: SpotifyAlbumSimple;
}

// Episode (podcast, as returned in playback state)
export interface SpotifyEpisode {
  id: string;
  name: string;
  uri: string;
  type: 'episode';
  duration_ms: number;
  explicit: boolean;
  description: string;
  release_date: string;
  resume_point?: {
    fully_played: boolean;
    resume_position_ms: number;
  };
  show: {
    id: string;
    name: string;
    uri: string;
  };
}

// Playback state (GET /me/player)
export interface PlaybackState {
  is_playing: boolean;
  progress_ms: number | null;
  shuffle_state: boolean;
  repeat_state: 'off' | 'context' | 'track';
  timestamp: number;
  device: SpotifyDevice;
  item: SpotifyTrack | SpotifyEpisode | null;
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown';
  context: {
    type: string;
    uri: string;
  } | null;
}

// Queue (GET /me/player/queue)
export interface SpotifyQueue {
  currently_playing: SpotifyTrack | SpotifyEpisode | null;
  queue: (SpotifyTrack | SpotifyEpisode)[];
}
