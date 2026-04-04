import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpotifyClient } from '../client.js';
import type {
  SpotifyTrack,
  SpotifyArtistFull,
  SpotifyArtistAlbumsResponse,
  SpotifyAlbumFull,
  AudioFeatures,
  AudioAnalysis,
  SpotifyShowFull,
  SpotifyEpisodeFull,
} from '../types/spotify.js';

const KEY_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatKey(key: number, mode: number): string {
  return `${KEY_NAMES[key] ?? key} ${mode === 1 ? 'major' : 'minor'}`;
}

export function registerCatalogTools(server: McpServer, client: SpotifyClient): void {
  // get_track
  server.tool(
    'get_track',
    'Get full details for a track by ID',
    { id: z.string().describe('Spotify track ID') },
    async (args) => {
      const track = await client.get<SpotifyTrack>(`/tracks/${encodeURIComponent(args.id)}`);
      if (!track) throw new Error('Track not found');

      const artists = track.artists.map((a) => a.name).join(', ');
      const lines = [
        `"${track.name}" by ${artists}`,
        `Album: ${track.album.name}`,
        `Duration: ${formatDuration(track.duration_ms)}`,
        `Explicit: ${track.explicit ? 'yes' : 'no'}`,
        `URI: ${track.uri}`,
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // get_artist
  server.tool(
    'get_artist',
    'Get artist info by ID',
    { id: z.string().describe('Spotify artist ID') },
    async (args) => {
      const artist = await client.get<SpotifyArtistFull>(`/artists/${encodeURIComponent(args.id)}`);
      if (!artist) throw new Error('Artist not found');

      const genres = artist.genres.length ? artist.genres.join(', ') : 'none listed';
      const lines = [
        `Artist: ${artist.name}`,
        `Genres: ${genres}`,
        `URI: ${artist.uri}`,
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // get_artist_albums
  server.tool(
    'get_artist_albums',
    "List an artist's albums and singles",
    {
      id: z.string().describe('Spotify artist ID'),
      include_groups: z
        .array(z.enum(['album', 'single', 'appears_on', 'compilation']))
        .optional()
        .describe('Album types to include. Default: ["album","single"]'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Results per page, 1–50. Default: 20'),
    },
    async (args) => {
      const params: Record<string, string> = {
        include_groups: (args.include_groups ?? ['album', 'single']).join(','),
        limit: String(args.limit ?? 20),
      };

      const result = await client.get<SpotifyArtistAlbumsResponse>(
        `/artists/${encodeURIComponent(args.id)}/albums`,
        params,
      );
      if (!result) throw new Error('Artist not found');

      const lines = [`Albums for artist (${result.total} total):`];
      for (const album of result.items) {
        const artists = album.artists.map((a) => a.name).join(', ');
        lines.push(
          `  • "${album.name}" by ${artists} (${album.album_type}, ${album.release_date}, ${album.total_tracks} tracks) | URI: ${album.uri}`,
        );
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // get_album
  server.tool(
    'get_album',
    'Get album details and track list by ID',
    { id: z.string().describe('Spotify album ID') },
    async (args) => {
      const album = await client.get<SpotifyAlbumFull>(`/albums/${encodeURIComponent(args.id)}`);
      if (!album) throw new Error('Album not found');

      const artists = album.artists.map((a) => a.name).join(', ');
      const lines = [
        `"${album.name}" by ${artists}`,
        `Released: ${album.release_date} | ${album.total_tracks} tracks`,
        `URI: ${album.uri}`,
        '',
        'Tracks:',
      ];
      for (const track of album.tracks.items) {
        const trackArtists = track.artists.map((a) => a.name).join(', ');
        lines.push(
          `  ${track.track_number}. "${track.name}" by ${trackArtists} (${formatDuration(track.duration_ms)}) | URI: ${track.uri}`,
        );
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // get_audio_features
  server.tool(
    'get_audio_features',
    'Get audio characteristics for a track (tempo, energy, danceability, etc.)',
    { id: z.string().describe('Spotify track ID') },
    async (args) => {
      const features = await client.get<AudioFeatures>(
        `/audio-features/${encodeURIComponent(args.id)}`,
      );
      if (!features) throw new Error('Audio features not found');

      const lines = [
        `Audio features for track ${args.id}:`,
        `Tempo: ${features.tempo.toFixed(1)} BPM | Time signature: ${features.time_signature}/4`,
        `Key: ${formatKey(features.key, features.mode)}`,
        `Energy: ${features.energy.toFixed(2)} | Danceability: ${features.danceability.toFixed(2)} | Valence: ${features.valence.toFixed(2)}`,
        `Acousticness: ${features.acousticness.toFixed(2)} | Instrumentalness: ${features.instrumentalness.toFixed(2)}`,
        `Liveness: ${features.liveness.toFixed(2)} | Speechiness: ${features.speechiness.toFixed(2)}`,
        `Loudness: ${features.loudness.toFixed(1)} dB`,
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // get_audio_analysis
  server.tool(
    'get_audio_analysis',
    'Get detailed time-domain structural breakdown of a track (sections, beats, segments)',
    { id: z.string().describe('Spotify track ID') },
    async (args) => {
      const analysis = await client.get<AudioAnalysis>(
        `/audio-analysis/${encodeURIComponent(args.id)}`,
      );
      if (!analysis) throw new Error('Audio analysis not found');

      const { track, sections, bars, beats, tatums, segments } = analysis;
      const lines = [
        `Audio analysis for track ${args.id}:`,
        '',
        'Track-level:',
        `  Duration: ${formatDuration(Math.round(track.duration * 1000))}`,
        `  Tempo: ${track.tempo.toFixed(1)} BPM | Time signature: ${track.time_signature}/4`,
        `  Key: ${formatKey(track.key, track.mode)}`,
        `  Loudness: ${track.loudness.toFixed(1)} dB`,
        `  Fade in ends: ${track.end_of_fade_in.toFixed(2)}s | Fade out starts: ${track.start_of_fade_out.toFixed(2)}s`,
        '',
        `Sections (${sections.length}):`,
        ...sections.map(
          (s, i) =>
            `  ${i + 1}. ${s.start.toFixed(2)}s–${(s.start + s.duration).toFixed(2)}s | ${s.tempo.toFixed(1)} BPM, ${formatKey(s.key, s.mode)}, ${s.loudness.toFixed(1)} dB`,
        ),
        '',
        `Bars: ${bars.length} | Beats: ${beats.length} | Tatums: ${tatums.length} | Segments: ${segments.length}`,
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // get_show
  server.tool(
    'get_show',
    'Get full details for a podcast show',
    {
      id: z.string().describe('Spotify show ID'),
      market: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
    },
    async (args) => {
      const params: Record<string, string> = {};
      if (args.market) params.market = args.market;

      const show = await client.get<SpotifyShowFull>(
        `/shows/${encodeURIComponent(args.id)}`,
        params,
      );
      if (!show) throw new Error('Show not found');

      const lines = [
        `"${show.name}" by ${show.publisher}`,
        show.description,
        `Episodes: ${show.total_episodes} | Explicit: ${show.explicit ? 'yes' : 'no'}`,
        `Languages: ${show.languages.join(', ')} | Media type: ${show.media_type}`,
        `URI: ${show.uri}`,
      ];

      if (show.episodes?.items.length) {
        lines.push('', 'Recent episodes:');
        for (const ep of show.episodes.items.slice(0, 10)) {
          const played = ep.resume_point?.fully_played ? ' [played]' : '';
          lines.push(
            `  • "${ep.name}" (${formatDuration(ep.duration_ms)}, ${ep.release_date})${played} | URI: ${ep.uri}`,
          );
        }
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // get_episode
  server.tool(
    'get_episode',
    'Get full details for a podcast episode',
    {
      id: z.string().describe('Spotify episode ID'),
      market: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
    },
    async (args) => {
      const params: Record<string, string> = {};
      if (args.market) params.market = args.market;

      const episode = await client.get<SpotifyEpisodeFull>(
        `/episodes/${encodeURIComponent(args.id)}`,
        params,
      );
      if (!episode) throw new Error('Episode not found');

      const lines = [
        `"${episode.name}"`,
        `Show: ${episode.show.name}`,
        episode.description,
        `Duration: ${formatDuration(episode.duration_ms)} | Released: ${episode.release_date}`,
        `Explicit: ${episode.explicit ? 'yes' : 'no'} | Languages: ${episode.languages.join(', ')}`,
      ];

      if (episode.resume_point) {
        const status = episode.resume_point.fully_played
          ? 'Fully played'
          : `Resume at ${formatDuration(episode.resume_point.resume_position_ms)}`;
        lines.push(`Resume point: ${status}`);
      }

      if (episode.audio_preview_url) {
        lines.push(`Preview: ${episode.audio_preview_url}`);
      }

      lines.push(`URI: ${episode.uri}`);

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}
