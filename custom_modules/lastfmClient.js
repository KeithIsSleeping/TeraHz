const https = require('https');
const config = require('../config');

const LASTFM_BASE = 'ws.audioscrobbler.com';
const LASTFM_PATH = '/2.0/';

/**
 * Make a GET request to the Last.fm API.
 * Returns a promise that resolves with the parsed JSON response.
 */
function lastfmGet(params) {
    return new Promise((resolve, reject) => {
        const qs = Object.entries(params)
            .map(([k, v]) => k + '=' + encodeURIComponent(v))
            .join('&');
        const fullPath = LASTFM_PATH + '?' + qs + '&api_key=' + config.lastfmApiKey + '&format=json';

        const options = {
            hostname: LASTFM_BASE,
            port: 443,
            path: fullPath,
            method: 'GET',
            headers: { 'User-Agent': 'TeraHz/1.0' }
        };

        https.get(options, (res) => {
            let chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString();
                try {
                    const data = JSON.parse(text);
                    if (data.error) {
                        console.log('Last.fm API error:', data.message || data.error);
                        resolve(null);
                    } else {
                        resolve(data);
                    }
                } catch (e) {
                    console.log('Last.fm parse error:', text.substring(0, 200));
                    resolve(null);
                }
            });
        }).on('error', (e) => {
            console.log('Last.fm request error:', e.message);
            resolve(null);
        });
    });
}

/**
 * Get similar tracks for a given artist + track name.
 * Returns array of { name, artist } objects.
 */
async function getSimilarTracks(artistName, trackName, limit = 30) {
    const data = await lastfmGet({
        method: 'track.getsimilar',
        artist: artistName,
        track: trackName,
        autocorrect: 1,
        limit: limit
    });
    if (!data || !data.similartracks || !data.similartracks.track) return [];
    const tracks = data.similartracks.track;
    // Last.fm returns an object instead of array when there's only one result
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    return arr.map(t => ({
        name: t.name,
        artist: typeof t.artist === 'string' ? t.artist : (t.artist && t.artist.name) || ''
    })).filter(t => t.name && t.artist);
}

/**
 * Get similar artists for a given artist name.
 * Returns array of { name, match } objects.
 */
async function getSimilarArtists(artistName, limit = 20) {
    const data = await lastfmGet({
        method: 'artist.getsimilar',
        artist: artistName,
        autocorrect: 1,
        limit: limit
    });
    if (!data || !data.similarartists || !data.similarartists.artist) return [];
    const artists = data.similarartists.artist;
    const arr = Array.isArray(artists) ? artists : [artists];
    return arr.map(a => ({
        name: a.name,
        match: parseFloat(a.match) || 0
    })).filter(a => a.name);
}

/**
 * Get top tracks for a given tag/genre.
 * Returns array of { name, artist } objects.
 */
async function getTopTracksByTag(tag, limit = 30, page = 1) {
    const data = await lastfmGet({
        method: 'tag.gettoptracks',
        tag: tag,
        limit: limit,
        page: page
    });
    if (!data || !data.tracks || !data.tracks.track) return [];
    const tracks = data.tracks.track;
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    return arr.map(t => ({
        name: t.name,
        artist: typeof t.artist === 'string' ? t.artist : (t.artist && t.artist.name) || ''
    })).filter(t => t.name && t.artist);
}

/**
 * Check if the Last.fm API key is configured.
 */
function isConfigured() {
    return config.lastfmApiKey && config.lastfmApiKey !== 'YOUR_LASTFM_API_KEY';
}

module.exports = {
    getSimilarTracks,
    getSimilarArtists,
    getTopTracksByTag,
    isConfigured
};
