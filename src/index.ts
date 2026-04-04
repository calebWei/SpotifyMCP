import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { runAuthFlow } from './auth.js';
import { SpotifyClient } from './client.js';
import { registerPlaybackTools } from './tools/playback.js';

async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'spotify-mcp',
    version: '1.0.0',
  });

  const client = new SpotifyClient();

  registerPlaybackTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const command = process.argv[2];

if (command === 'auth') {
  runAuthFlow().catch((err: unknown) => {
    console.error('Auth failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
} else {
  startMcpServer().catch((err: unknown) => {
    console.error('Server error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
