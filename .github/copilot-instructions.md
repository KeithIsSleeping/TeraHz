# TeraHz — Copilot Instructions

## Project Overview

TeraHz is a music discovery app that lets users search for songs by BPM (beats per minute), browse genres, and build Spotify playlists. It uses the Spotify API for music data/playback and the Last.fm API for genre metadata.

## Architecture

- **Backend**: Node.js + Express (`index.js`) — serves the API and static React build
- **Frontend**: React (Create React App) in `client/` — built to `client/build/`
- **Custom modules**: `custom_modules/` — `bearerToken.js`, `spotifyClient.js`, `lastfmClient.js`
- **Config**: `config.js` reads all secrets from environment variables via `dotenv`

## Local Development

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..

# 2. Create .env from template
cp .env.example .env
# Fill in SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, LASTFM_API_KEY

# 3. Build the React client
npm run build

# 4. Start the server
npm start
# → http://localhost:3000
```

## Environment Variables

All secrets are in `.env` (gitignored). See `.env.example` for the template:

| Variable | Description |
|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `LASTFM_API_KEY` | Last.fm API key |
| `PORT` | Server port (default: 3000, Azure uses 8080) |
| `SSL_KEY_PATH` | Path to SSL private key (optional, omit for HTTP) |
| `SSL_CERT_PATH` | Path to SSL certificate (optional, omit for HTTP) |
| `AZURE_RESOURCE_GROUP` | Azure resource group for deployment |
| `AZURE_APP_NAME` | Azure web app name for deployment |

**Never hardcode secrets in source files.** Always use `process.env` via `config.js`.

## Azure Deployment

### Infrastructure

- **Hosting**: Azure App Service (Linux, Node 20 LTS)
- **Resource group**: Set via `AZURE_RESOURCE_GROUP` in `.env`
- **App Service plan**: S1 Standard (or your chosen SKU/region)
- **Web app**: Set via `AZURE_APP_NAME` in `.env`
- **Startup command**: `node index.js`

### App Settings (set in Azure, not in code)

These are configured via the Azure portal or CLI, not committed to the repo:

```
SPOTIFY_CLIENT_ID=<value>
SPOTIFY_CLIENT_SECRET=<value>
LASTFM_API_KEY=<value>
SCM_DO_BUILD_DURING_DEPLOYMENT=false
PORT=8080
```

### Deploy Script

Run `.\.deploy.ps1` from the project root (PowerShell). The script reads
`AZURE_RESOURCE_GROUP` and `AZURE_APP_NAME` from `.env` (CLI args override).

1. Loads Azure target from `.env`
2. Validates Azure CLI login and web app existence
3. Builds the React client (`client/build/`)
4. Installs production-only npm dependencies
5. Creates a zip with forward-slash paths (required for Linux App Service)
6. Deploys via `az webapp deployment source config-zip` (standard GA command)
7. Cleans up the zip after deployment

```powershell
# Uses AZURE_RESOURCE_GROUP and AZURE_APP_NAME from .env
.\deploy.ps1

# Override with CLI args
.\deploy.ps1 -AppName terahz-staging -ResourceGroup terahz-staging-rg
```

### Deployment Pitfalls

- **Windows zip paths**: PowerShell's `Compress-Archive` creates backslash (`\`) paths that fail on Linux. The deploy script uses .NET `ZipFile` API with explicit `/` separators.
- **Oryx build interference**: `SCM_DO_BUILD_DURING_DEPLOYMENT` must be `false`. Oryx rearranges files and breaks the app's `node_modules` layout.
- **node_modules must be in the zip**: Since Oryx build is disabled, the zip must include `node_modules/` with production dependencies pre-installed.

### Spotify Redirect URI

For Spotify OAuth to work, add the callback URL in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):

```
https://terahz.azurewebsites.net/auth/callback
```

## Files Not Committed (gitignored)

- `.env` — secrets and Azure deployment config
- `node_modules/` — dependencies
- `client/build/` — React build output
- `*.zip` — deployment packages
- `.azure/` — local Azure CLI metadata
