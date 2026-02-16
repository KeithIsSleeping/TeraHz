const bearerToken = require('./bearerToken');
const https = require('https');

function makeWebRequest(requestedPath, cb) {
    console.log('Spotify API request:', requestedPath);
    var options = {
        hostname: 'api.spotify.com',
        port: 443,
        path: requestedPath,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + bearerToken.getAccessToken()
        }
    };

    https.get(options, function (res) {
        var bodyChunks = [];
        res.on('data', function (chunk) {
            bodyChunks.push(chunk);
        }).on('end', function () {
            const text = Buffer.concat(bodyChunks).toString();
            console.log('Spotify API status:', res.statusCode, 'body length:', text.length);
            if (!text || text.length === 0) {
                cb(JSON.stringify({ error: { status: res.statusCode, message: 'Empty response from Spotify API' } }));
                return;
            }
            // Try to parse to check for Spotify API errors
            try {
                const parsed = JSON.parse(text);
                if (res.statusCode >= 400) {
                    console.log('Spotify API error:', text.substring(0, 500));
                }
                cb(JSON.stringify(parsed));
            } catch (e) {
                console.log('Non-JSON response from Spotify:', text.substring(0, 200));
                cb(JSON.stringify({ error: { status: res.statusCode, message: 'Invalid response from Spotify' } }));
            }
        });
    }).on('error', function (e) {
        console.log('Spotify request error:', e.message);
        cb(JSON.stringify({ error: { status: 500, message: e.message } }));
    });
}

function privateGetSongAnalysis(songId, callback) {
    makeWebRequest('/v1/audio-analysis/' + songId, callback);
}

function privateGetSong(songId, callback) {
    makeWebRequest('/v1/tracks/' + songId, callback);
}

function privateSearchSong(songQuery, callback) {
    makeWebRequest('/v1/search/?q=' + encodeURIComponent(songQuery) + '&type=track', callback);
}

function privateSearchArtist(songQuery, callback) {
    makeWebRequest('/v1/search/?q=' + encodeURIComponent(songQuery) + '&type=artist', callback);
}

function privateGetGenreSeeds(callback) {
    makeWebRequest('/v1/recommendations/available-genre-seeds', callback);
}

function privateGetAudioFeatures(trackId, callback) {
    makeWebRequest('/v1/audio-features/' + trackId, callback);
}

function privateGetRecommendations(params, callback) {
    // Build query string from params object
    // Supported params: seed_artists, seed_genres, seed_tracks, limit,
    // and all tunable attributes with min_, max_, target_ prefixes:
    // acousticness, danceability, duration_ms, energy, instrumentalness,
    // key, liveness, loudness, mode, popularity, speechiness, tempo, 
    // time_signature, valence
    const queryParts = [];
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            queryParts.push(key + '=' + encodeURIComponent(value));
        }
    }
    const queryString = queryParts.join('&');
    makeWebRequest('/v1/recommendations?' + queryString, callback);
}

module.exports = {
    getSongAnalysis: privateGetSongAnalysis,
    getSong: privateGetSong,
    searchSong: privateSearchSong,
    searchArtist: privateSearchArtist,
    getGenreSeeds: privateGetGenreSeeds,
    getAudioFeatures: privateGetAudioFeatures,
    getRecommendations: privateGetRecommendations
}
