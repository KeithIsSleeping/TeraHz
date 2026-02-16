require('dotenv').config();
const bearerToken = require('./custom_modules/bearerToken');
const spotifyClient = require('./custom_modules/spotifyClient');
const lastfmClient = require('./custom_modules/lastfmClient');
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

const app = express();
const port = process.env.PORT || 3000;

bearerToken.start();

app.use(express.json());
app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 2 } // 2 hours
}));

// Serve the React app
app.use(express.static(path.join(__dirname, 'client', 'build')));

// ============================================================
// OAUTH FLOW
// ============================================================
const SCOPES = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-library-read'
].join(' ');

function getRedirectUri(req) {
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    return protocol + '://' + host + '/auth/callback';
}

app.get('/auth/login', (req, res) => {
    const state = uuidv4();
    req.session.oauthState = state;
    const redirectUri = getRedirectUri(req);
    req.session.redirectUri = redirectUri;
    const authUrl = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
        response_type: 'code',
        client_id: config.clientId,
        scope: SCOPES,
        redirect_uri: redirectUri,
        state: state,
        show_dialog: true
    });
    res.json({ url: authUrl });
});

app.get('/auth/callback', (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;

    if (error) {
        return res.redirect('/?auth_error=' + error);
    }

    const redirectUri = req.session.redirectUri || getRedirectUri(req);
    const postData = querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret
    });

    const options = {
        hostname: 'accounts.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const tokenReq = https.request(options, (tokenRes) => {
        let data = '';
        tokenRes.on('data', chunk => data += chunk);
        tokenRes.on('end', () => {
            try {
                const result = JSON.parse(data);
                if (result.access_token) {
                    req.session.userAccessToken = result.access_token;
                    req.session.userRefreshToken = result.refresh_token;
                    req.session.tokenExpiry = Date.now() + (result.expires_in * 1000);
                    res.redirect('/?auth_success=true');
                } else {
                    res.redirect('/?auth_error=token_exchange_failed');
                }
            } catch (e) {
                res.redirect('/?auth_error=parse_error');
            }
        });
    });
    tokenReq.on('error', () => res.redirect('/?auth_error=network_error'));
    tokenReq.write(postData);
    tokenReq.end();
});

function refreshUserToken(req, callback) {
    if (!req.session.userRefreshToken) return callback(false);
    const postData = querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: req.session.userRefreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret
    });
    const options = {
        hostname: 'accounts.spotify.com',
        path: '/api/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    const tokenReq = https.request(options, (tokenRes) => {
        let data = '';
        tokenRes.on('data', chunk => data += chunk);
        tokenRes.on('end', () => {
            try {
                const result = JSON.parse(data);
                if (result.access_token) {
                    req.session.userAccessToken = result.access_token;
                    req.session.tokenExpiry = Date.now() + (result.expires_in * 1000);
                    if (result.refresh_token) req.session.userRefreshToken = result.refresh_token;
                    callback(true);
                } else {
                    callback(false);
                }
            } catch (e) {
                callback(false);
            }
        });
    });
    tokenReq.on('error', () => callback(false));
    tokenReq.write(postData);
    tokenReq.end();
}

function getUserToken(req, callback) {
    if (!req.session.userAccessToken) return callback(null);
    if (Date.now() > (req.session.tokenExpiry - 60000)) {
        refreshUserToken(req, (success) => {
            callback(success ? req.session.userAccessToken : null);
        });
    } else {
        callback(req.session.userAccessToken);
    }
}

app.get('/auth/status', (req, res) => {
    if (req.session.userAccessToken) {
        getUserToken(req, (token) => {
            if (token) {
                // Fetch user profile
                makeUserRequest(token, '/v1/me', (err, data) => {
                    if (err) return res.json({ authenticated: false });
                    res.json({
                        authenticated: true,
                        user: {
                            id: data.id,
                            display_name: data.display_name,
                            email: data.email,
                            images: data.images
                        }
                    });
                });
            } else {
                res.json({ authenticated: false });
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ============================================================
// HELPER: Make authenticated user request
// ============================================================
function makeUserRequest(token, apiPath, callback) {
    const options = {
        hostname: 'api.spotify.com',
        port: 443,
        path: apiPath,
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
    };
    https.get(options, (res) => {
        let chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
            try {
                const data = JSON.parse(Buffer.concat(chunks).toString());
                callback(null, data);
            } catch (e) {
                callback(e, null);
            }
        });
    }).on('error', (e) => callback(e, null));
}

function makeUserPostRequest(token, apiPath, body, callback) {
    const bodyStr = JSON.stringify(body);
    const options = {
        hostname: 'api.spotify.com',
        port: 443,
        path: apiPath,
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr)
        }
    };
    const req = https.request(options, (res) => {
        let chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
            try {
                const data = JSON.parse(Buffer.concat(chunks).toString());
                callback(null, data);
            } catch (e) {
                callback(e, null);
            }
        });
    });
    req.on('error', (e) => callback(e, null));
    req.write(bodyStr);
    req.end();
}

// ============================================================
// EXISTING ENDPOINTS (using client credentials)
// ============================================================

app.get('/getSongAnalysis', (req, res) => {
    const songId = req.query.songId;
    spotifyClient.getSongAnalysis(songId, function (response) {
        res.send(response);
    });
});

app.get('/getSong', (req, res) => {
    const songId = req.query.songId;
    spotifyClient.getSong(songId, function (response) {
        res.send(response);
    });
});

app.get('/findSong', (req, res) => {
    const searchText = req.query.searchText;
    spotifyClient.searchSong(searchText, function (response) {
        res.send(response);
    });
});

app.get('/findArtist', (req, res) => {
    const searchText = req.query.searchText;
    spotifyClient.searchArtist(searchText, function (response) {
        res.send(response);
    });
});

// ============================================================
// NEW ENDPOINTS: Recommendations, Genres, Audio Features
// ============================================================

// Get available genre seeds (hardcoded fallback since Spotify deprecated this endpoint)
const GENRE_LIST = [
    'acoustic', 'afrobeat', 'alt-rock', 'alternative', 'ambient', 'anime',
    'black-metal', 'bluegrass', 'blues', 'bossanova', 'brazil', 'breakbeat',
    'british', 'cantopop', 'chicago-house', 'children', 'chill', 'classical',
    'club', 'comedy', 'country', 'dance', 'dancehall', 'death-metal',
    'deep-house', 'detroit-techno', 'disco', 'disney', 'drum-and-bass', 'dub',
    'dubstep', 'edm', 'electro', 'electronic', 'emo', 'folk', 'forro',
    'french', 'funk', 'garage', 'german', 'gospel', 'goth', 'grindcore',
    'groove', 'grunge', 'guitar', 'happy', 'hard-rock', 'hardcore',
    'hardstyle', 'heavy-metal', 'hip-hop', 'holidays', 'honky-tonk', 'house',
    'idm', 'indian', 'indie', 'indie-pop', 'industrial', 'iranian', 'j-dance',
    'j-idol', 'j-pop', 'j-rock', 'jazz', 'k-pop', 'kids', 'latin',
    'latino', 'malay', 'mandopop', 'metal', 'metal-misc', 'metalcore',
    'minimal-techno', 'movies', 'mpb', 'new-age', 'new-release', 'opera',
    'pagode', 'party', 'philippines-opm', 'piano', 'pop', 'pop-film',
    'post-dubstep', 'power-pop', 'progressive-house', 'psych-rock', 'punk',
    'punk-rock', 'r-n-b', 'rainy-day', 'reggae', 'reggaeton', 'road-trip',
    'rock', 'rock-n-roll', 'rockabilly', 'romance', 'sad', 'salsa', 'samba',
    'sertanejo', 'show-tunes', 'singer-songwriter', 'ska', 'sleep',
    'songwriter', 'soul', 'soundtracks', 'spanish', 'study', 'summer',
    'swedish', 'synth-pop', 'tango', 'techno', 'trance', 'trip-hop',
    'turkish', 'work-out', 'world-music'
];
app.get('/getGenreSeeds', (req, res) => {
    res.json({ genres: GENRE_LIST });
});

// Get audio features for a track
app.get('/getAudioFeatures', (req, res) => {
    const trackId = req.query.trackId;
    spotifyClient.getAudioFeatures(trackId, function (response) {
        res.send(response);
    });
});

// Get recommendations based on seeds — uses Last.fm similar tracks/artists + Spotify cross-match
app.get('/getRecommendations', async (req, res) => {
    const { seed_tracks, seed_artists, seed_genres, limit } = req.query;
    const trackLimit = Math.min(parseInt(limit) || 30, 100);
    console.log('Recommendation request:', { seed_tracks, seed_artists, seed_genres, limit: trackLimit });

    const seedTrackIds = seed_tracks ? seed_tracks.split(',').filter(Boolean) : [];
    const seedArtistIds = seed_artists ? seed_artists.split(',').filter(Boolean) : [];
    const seedGenres = seed_genres ? seed_genres.split(',').filter(Boolean) : [];

    if (seedTrackIds.length + seedArtistIds.length + seedGenres.length === 0) {
        return res.json({ error: { message: 'At least one seed is required.' } });
    }

    // Helper: promisified Spotify API call
    function spotifyGet(apiPath) {
        return new Promise((resolve) => {
            const bearerToken = require('./custom_modules/bearerToken');
            const opts = {
                hostname: 'api.spotify.com', port: 443, path: apiPath, method: 'GET',
                headers: { 'Authorization': 'Bearer ' + bearerToken.getAccessToken() }
            };
            https.get(opts, (apiRes) => {
                let chunks = [];
                apiRes.on('data', c => chunks.push(c));
                apiRes.on('end', () => {
                    try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
                    catch (e) { resolve(null); }
                });
            }).on('error', () => resolve(null));
        });
    }

    // Helper: search Spotify for a specific track by name + artist, return first match
    function searchSpotifyTrack(trackName, artistName) {
        const query = 'track:' + trackName + ' artist:' + artistName;
        const path = '/v1/search/?q=' + encodeURIComponent(query) + '&type=track&limit=1';
        return spotifyGet(path).then(d => {
            if (d && d.tracks && d.tracks.items && d.tracks.items.length > 0) {
                return d.tracks.items[0];
            }
            return null;
        });
    }

    // Helper: search Spotify tracks by artist name, return multiple results
    function searchSpotifyByArtist(artistName, searchLimit) {
        const path = '/v1/search/?q=' + encodeURIComponent('artist:' + artistName)
            + '&type=track&limit=' + (searchLimit || 10);
        return spotifyGet(path).then(d => (d && d.tracks && d.tracks.items) || []);
    }

    const useLastfm = lastfmClient.isConfigured();
    console.log('Using Last.fm:', useLastfm);

    try {
        const candidateTracks = []; // Array of Spotify track objects
        const seenIds = new Set(seedTrackIds);

        // We need track/artist info from Spotify for both engines, so fetch once
        const seedTrackInfos = await Promise.all(
            seedTrackIds.map(id => spotifyGet('/v1/tracks/' + id))
        );
        const seedArtistInfos = await Promise.all(
            seedArtistIds.map(id => spotifyGet('/v1/artists/' + id))
        );

        // ================== LAST.FM SIMILARITY ENGINE ==================
        if (useLastfm) {
            // For seed tracks: Last.fm similar tracks → cross-match to Spotify
            for (const track of seedTrackInfos) {
                if (!track || !track.artists || !track.artists[0]) continue;
                const artistName = track.artists[0].name;
                const trackName = track.name;

                console.log('Last.fm: getting similar tracks for', artistName, '-', trackName);
                const similar = await lastfmClient.getSimilarTracks(artistName, trackName, 30);
                console.log('Last.fm: found', similar.length, 'similar tracks');

                const batch = similar.slice(0, 15);
                const spotifyMatches = await Promise.all(
                    batch.map(s => searchSpotifyTrack(s.name, s.artist))
                );
                for (const match of spotifyMatches) {
                    if (match && !seenIds.has(match.id)) {
                        seenIds.add(match.id);
                        candidateTracks.push(match);
                    }
                }
            }

            // For seed artists: Last.fm similar artists → Spotify tracks
            for (const artist of seedArtistInfos) {
                if (!artist || !artist.name) continue;

                console.log('Last.fm: getting similar artists for', artist.name);
                const similarArtists = await lastfmClient.getSimilarArtists(artist.name, 15);
                console.log('Last.fm: found', similarArtists.length, 'similar artists');

                const artistBatches = similarArtists.slice(0, 10);
                const artistResults = await Promise.all(
                    artistBatches.map(a => searchSpotifyByArtist(a.name, 5))
                );
                for (const tracks of artistResults) {
                    for (const track of tracks) {
                        if (track && !seenIds.has(track.id)) {
                            seenIds.add(track.id);
                            candidateTracks.push(track);
                        }
                    }
                }
            }

            // For seed genres: Last.fm tag.getTopTracks → cross-match to Spotify
            for (const genre of seedGenres) {
                const randomPage = Math.floor(Math.random() * 3) + 1;
                console.log('Last.fm: getting top tracks for tag', genre, 'page', randomPage);
                const tagTracks = await lastfmClient.getTopTracksByTag(genre, 30, randomPage);
                console.log('Last.fm: found', tagTracks.length, 'tag tracks');

                const batch = tagTracks.slice(0, 15);
                const spotifyMatches = await Promise.all(
                    batch.map(t => searchSpotifyTrack(t.name, t.artist))
                );
                for (const match of spotifyMatches) {
                    if (match && !seenIds.has(match.id)) {
                        seenIds.add(match.id);
                        candidateTracks.push(match);
                    }
                }
            }

        }

        // ================== SPOTIFY SEARCH ENGINE (always runs) ==================
        console.log('Spotify search: supplementing with keyword searches');

        function searchTracks(query, searchLimit, offset) {
            const path = '/v1/search/?q=' + encodeURIComponent(query)
                + '&type=track&limit=' + (searchLimit || 20)
                + (offset ? '&offset=' + offset : '');
            return spotifyGet(path).then(d => (d && d.tracks && d.tracks.items) || []);
        }

        const searches = [];
        for (const track of seedTrackInfos) {
            if (!track || !track.artists || !track.artists[0]) continue;
            // Search by same artist → finds catalog neighbors
            searches.push(searchTracks('artist:' + track.artists[0].name, 20));
            // Search by track name → finds covers and similarly-named tracks
            searches.push(searchTracks(track.name, 10));
        }
        for (const artist of seedArtistInfos) {
            if (!artist || !artist.name) continue;
            searches.push(searchTracks('artist:' + artist.name, 20));
        }
        for (const genre of seedGenres) {
            searches.push(searchTracks('genre:' + genre, 20));
        }

        const searchResults = await Promise.all(searches);
        for (const batch of searchResults) {
            for (const track of batch) {
                if (track && track.id && !seenIds.has(track.id)) {
                    seenIds.add(track.id);
                    candidateTracks.push(track);
                }
            }
        }

        // Shuffle for variety
        for (let i = candidateTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidateTracks[i], candidateTracks[j]] = [candidateTracks[j], candidateTracks[i]];
        }

        const finalTracks = candidateTracks.slice(0, trackLimit);
        console.log('Recommendations:', finalTracks.length, 'tracks from', candidateTracks.length, 'candidates');
        res.json({ tracks: finalTracks, seeds: [] });
    } catch (err) {
        console.error('Recommendation error:', err);
        res.json({ error: { message: 'Failed to generate recommendations.' } });
    }
});

// Get user's top tracks (requires user auth)
app.get('/getTopTracks', (req, res) => {
    getUserToken(req, (token) => {
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        const timeRange = req.query.time_range || 'medium_term';
        const limit = req.query.limit || 20;
        makeUserRequest(token, `/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`, (err, data) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch top tracks' });
            res.json(data);
        });
    });
});

// Get user's top artists (requires user auth)
app.get('/getTopArtists', (req, res) => {
    getUserToken(req, (token) => {
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        const timeRange = req.query.time_range || 'medium_term';
        const limit = req.query.limit || 20;
        makeUserRequest(token, `/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`, (err, data) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch top artists' });
            res.json(data);
        });
    });
});

// ============================================================
// PLAYLIST CREATION ENDPOINTS (require user auth)
// ============================================================

// Create a new playlist
app.post('/createPlaylist', (req, res) => {
    getUserToken(req, (token) => {
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        const { name, description, isPublic } = req.body;
        // First get user ID
        makeUserRequest(token, '/v1/me', (err, userData) => {
            if (err) return res.status(500).json({ error: 'Failed to get user profile' });
            const body = {
                name: name || 'TeraHz Playlist',
                description: description || 'Generated by TeraHz',
                public: isPublic !== undefined ? isPublic : true
            };
            makeUserPostRequest(token, `/v1/users/${userData.id}/playlists`, body, (err, data) => {
                if (err) return res.status(500).json({ error: 'Failed to create playlist' });
                res.json(data);
            });
        });
    });
});

// Add tracks to a playlist
app.post('/addTracksToPlaylist', (req, res) => {
    getUserToken(req, (token) => {
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        const { playlistId, trackUris } = req.body;
        const body = { uris: trackUris };
        makeUserPostRequest(token, `/v1/playlists/${playlistId}/tracks`, body, (err, data) => {
            if (err) return res.status(500).json({ error: 'Failed to add tracks' });
            res.json(data);
        });
    });
});

// Catch-all: serve React app for any non-API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// Try to start HTTPS if SSL certs exist, otherwise fall back to HTTP
const SSL_KEY = process.env.SSL_KEY_PATH || '';
const SSL_CERT = process.env.SSL_CERT_PATH || '';

if (fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
    const sslOptions = {
        key: fs.readFileSync(SSL_KEY),
        cert: fs.readFileSync(SSL_CERT)
    };
    https.createServer(sslOptions, app).listen(port, () => {
        console.log('HTTPS server listening on port ' + port);
    });

    // Optional: redirect HTTP → HTTPS
    const http = require('http');
    http.createServer((req, res) => {
        const host = req.headers.host ? req.headers.host.replace(/:.*/, '') : 'localhost';
        res.writeHead(301, { Location: 'https://' + host + ':' + port + req.url });
        res.end();
    }).listen(80, () => {
        console.log('HTTP redirect server listening on port 80');
    }).on('error', (e) => {
        console.log('Could not start HTTP redirect on port 80:', e.message);
    });
} else {
    app.listen(port, () => {
        console.log('HTTP server listening on port ' + port + ' (no SSL certs found)');
    });
}