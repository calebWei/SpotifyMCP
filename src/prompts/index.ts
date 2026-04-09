import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer): void {
  // dj — act as a DJ based on user's top artists and mood
  server.prompt(
    'dj',
    'Act as a DJ. Based on my top artists and current mood, queue up a set of songs.',
    async () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: 'Act as a DJ. Use get_top_artists and get_top_tracks to understand my music taste, then use get_recommendations to find a great set of songs that match my taste. Queue them up using add_to_queue one by one. Aim for a cohesive set of 5–10 tracks.',
        },
      }],
    }),
  );

  // playlist_from_mood — create a playlist for a given mood
  server.prompt(
    'playlist_from_mood',
    'Create a playlist for a given mood. Searches for tracks and adds them to a new playlist.',
    {
      mood: z.string().describe('The mood or vibe for the playlist (e.g. "rainy afternoon", "morning run", "late night coding")'),
    },
    async (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Create a playlist for this mood: "${args.mood}". Use search and get_recommendations to find 15–20 tracks that fit the vibe. Then use create_playlist to make a new playlist with a fitting name and description, and add_to_playlist to fill it with the tracks you found.`,
        },
      }],
    }),
  );

  // music_taste_summary — summarize the user's music taste
  server.prompt(
    'music_taste_summary',
    "Summarize the user's music taste based on their top tracks and artists across all time ranges.",
    async () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: "Summarize my music taste. Call get_top_tracks and get_top_artists for all three time ranges (short_term, medium_term, long_term). Then write a detailed summary of my taste: genres I gravitate toward, artists I keep coming back to, how my taste has shifted over time, and what that says about my listening habits.",
        },
      }],
    }),
  );

  // discover_weekly_alternative — personalized discovery based on top tracks
  server.prompt(
    'discover_weekly_alternative',
    "Based on my top tracks, recommend 20 songs I probably haven't heard.",
    async () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: "Generate a personalised discovery playlist for me. Use get_top_tracks (short_term) to find my recent favourites, then use get_recommendations seeded with those tracks to find 20 songs I probably haven't heard. Focus on variety — mix up the energy levels and moods while staying within my taste. Present the list with track names, artists, and URIs so I can play them.",
        },
      }],
    }),
  );
}
