import { createHash, randomBytes } from 'crypto';
import { createServer } from 'http';
import { mkdir, writeFile, readFile, chmod } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import open from 'open';
import type { TokenData } from './types/spotify.js';

const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:8888/callback';
const CALLBACK_PORT = 8888;

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-read-playback-position',
  'user-top-read',
  'user-library-read',
  'user-library-modify',
  'user-follow-read',
  'user-follow-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ');

function base64url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function getTokenPath(): string {
  return join(homedir(), '.spotify-mcp', 'tokens.json');
}

export async function loadTokens(): Promise<TokenData> {
  const tokenPath = getTokenPath();
  try {
    const data = await readFile(tokenPath, 'utf8');
    return JSON.parse(data) as TokenData;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('Not authenticated. Run "spotify-mcp auth" (or "npm run auth") first.');
    }
    throw err;
  }
}

export async function saveTokens(tokens: TokenData): Promise<void> {
  const tokenPath = getTokenPath();
  const dir = join(homedir(), '.spotify-mcp');
  await mkdir(dir, { recursive: true });
  await writeFile(tokenPath, JSON.stringify(tokens, null, 2), 'utf8');
  // Restrict to owner read/write only (ignored on Windows)
  try {
    await chmod(tokenPath, 0o600);
  } catch {
    // chmod may fail on Windows — that's acceptable
  }
}

export async function runAuthFlow(): Promise<void> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    console.error('Error: SPOTIFY_CLIENT_ID environment variable is not set.');
    process.exit(1);
  }

  // Generate PKCE values
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(
    createHash('sha256').update(codeVerifier).digest()
  );
  const state = base64url(randomBytes(16));

  // Build authorization URL
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
  });
  const authUrl = `https://accounts.spotify.com/authorize?${authParams}`;

  // Start local callback server
  const tokens = await new Promise<TokenData>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${CALLBACK_PORT}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const returnedState = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authentication failed: ${error}</h1>`);
        server.close();
        reject(new Error(`Spotify auth error: ${error}`));
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>State mismatch — possible CSRF. Try again.</h1>');
        server.close();
        reject(new Error('State mismatch in OAuth callback'));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>No authorization code received.</h1>');
        server.close();
        reject(new Error('No authorization code in callback'));
        return;
      }

      // Exchange code for tokens
      try {
        const tokenBody = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: clientId,
          code_verifier: codeVerifier,
        });

        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenBody.toString(),
        });

        if (!tokenRes.ok) {
          const text = await tokenRes.text();
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Token exchange failed. Check your CLIENT_ID and try again.</h1>');
          server.close();
          reject(new Error(`Token exchange failed: ${tokenRes.status} ${text}`));
          return;
        }

        const data = await tokenRes.json() as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        const result: TokenData = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Date.now() + data.expires_in * 1000,
        };

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication successful. You can close this tab.</h1>');
        server.close();
        resolve(result);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Internal error during token exchange.</h1>');
        server.close();
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, '127.0.0.1', () => {
      console.log(`Opening Spotify authorization page...`);
      console.log(`If your browser doesn't open, visit:\n${authUrl}`);
      open(authUrl).catch(() => {
        console.log(`Could not open browser automatically. Visit:\n${authUrl}`);
      });
    });

    server.on('error', (err) => {
      reject(new Error(`Failed to start callback server: ${err.message}`));
    });
  });

  await saveTokens(tokens);
  console.log('Authentication successful! Tokens saved to ~/.spotify-mcp/tokens.json');
}
