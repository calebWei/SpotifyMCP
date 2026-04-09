# SpotifyMCP

An MCP server that wraps the Spotify Web API, letting AI assistants (like Claude) create and manage playlists, search for music, control playback, and get personalized recommendations.

## Quick setup (no repo required)

### 1. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create a new app.
2. In the app settings, add the following **Redirect URI** exactly:
   ```
   http://127.0.0.1:8888/callback
   ```
3. Save. Copy your **Client ID**.

### 2. Authenticate

```bash
SPOTIFY_CLIENT_ID=your_client_id_here npx spotify-mcp auth
```

This opens your browser to the Spotify authorization page. After you approve, tokens are saved to `~/.spotify-mcp/tokens.json`. You only need to do this once — the server refreshes tokens automatically.

### 3. Configure Claude Desktop

Add the following to your `claude_desktop_config.json`:

- **Windows:** `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "spotify": {
      "command": "npx",
      "args": ["-y", "spotify-mcp"],
      "env": {
        "SPOTIFY_CLIENT_ID": "your_client_id_here"
      }
    }
  }
}
```

Fully quit and restart Claude Desktop. A hammer icon in the chat input confirms the server is connected.

## Usage

Once connected, you can ask Claude things like:

- "What are my top Spotify tracks?"
- "Create a playlist of chill lo-fi songs for studying"
- "Add the song Blinding Lights to my workout playlist"
- "What artists have I been listening to most lately?"
- "Make me a playlist with a late night driving vibe"

## Development

```bash
git clone https://github.com/calebWei/SpotifyMCP.git
cd SpotifyMCP
npm install
npm run build

# Authenticate
npm run auth   # requires SPOTIFY_CLIENT_ID in .env

# Run from source
npm run dev
```

Copy `.env.example` to `.env` and fill in your Client ID before running any dev commands.
