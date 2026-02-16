import React from 'react';
import '../css/site.css';
import SpotifySongSearch from './spotifySongSearch';
import SpotifyArtistSearch from './spotifyArtistSearch';
import GenreSelector from './genreSelector';
import PlaylistBuilder from './playlistBuilder';
import backendRequest from '../api/backendRequest';

class SiteContent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            searchMode: 'song',
            songDeselected: '',
            artistDeselected: '',
            songSeedList: [],
            artistSeedList: [],
            genreSeedList: [],
            recommendedTracks: [],
            loadingRecommendations: false,
            recommendationError: '',
            playlistTracks: [],
            playlistName: '',
            playlistDescription: '',
            playlistIsPublic: true,
            showVibes: false,
            activeVibes: [],
            trackLimit: 30,
            flyingTrack: null,
            recsVisible: true,
            playlistVisible: true
        };

        this.seedSongSelected = this.seedSongSelected.bind(this);
        this.seedArtistSelected = this.seedArtistSelected.bind(this);
        this.seedGenreSelected = this.seedGenreSelected.bind(this);
        this.handleGenerate = this.handleGenerate.bind(this);
        this.addTrackToPlaylist = this.addTrackToPlaylist.bind(this);
        this.addAllToPlaylist = this.addAllToPlaylist.bind(this);
        this.removeTrackFromPlaylist = this.removeTrackFromPlaylist.bind(this);
        this.saveState = this.saveState.bind(this);
        this.clearPlaylist = this.clearPlaylist.bind(this);
        this.handleScroll = this.handleScroll.bind(this);

        this.layoutRef = React.createRef();
        this.recsRef = React.createRef();
        this.playlistRef = React.createRef();
    }

    componentDidMount() {
        this.restoreState();
        this._scrollEl = null;
        // Observe scroll to track section visibility
        this._rafId = null;
        requestAnimationFrame(() => {
            this._scrollEl = this.layoutRef.current;
            if (this._scrollEl) {
                this._scrollEl.addEventListener('scroll', this.handleScroll, { passive: true });
                // Also listen on window for mobile where mainLayout may not be the scroller
                window.addEventListener('scroll', this.handleScroll, { passive: true });
            }
        });
    }

    componentWillUnmount() {
        if (this._scrollEl) {
            this._scrollEl.removeEventListener('scroll', this.handleScroll);
        }
        window.removeEventListener('scroll', this.handleScroll);
        if (this._rafId) cancelAnimationFrame(this._rafId);
    }

    handleScroll() {
        if (this._rafId) return;
        this._rafId = requestAnimationFrame(() => {
            this._rafId = null;
            const vp = window.innerHeight;
            let recsVis = true;
            let plVis = true;
            if (this.recsRef.current) {
                const r = this.recsRef.current.getBoundingClientRect();
                recsVis = r.top < vp && r.bottom > 0;
            }
            if (this.playlistRef.current) {
                const r = this.playlistRef.current.getBoundingClientRect();
                plVis = r.top < vp && r.bottom > 0;
            }
            if (recsVis !== this.state.recsVisible || plVis !== this.state.playlistVisible) {
                this.setState({ recsVisible: recsVis, playlistVisible: plVis });
            }
        });
    }

    scrollToRecs() {
        if (this.recsRef.current) {
            this.recsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    scrollToPlaylist() {
        if (this.playlistRef.current) {
            this.playlistRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    saveState() {
        const toSave = {
            searchMode: this.state.searchMode,
            songSeedList: this.state.songSeedList,
            artistSeedList: this.state.artistSeedList,
            genreSeedList: this.state.genreSeedList,
            recommendedTracks: this.state.recommendedTracks,
            playlistTracks: this.state.playlistTracks,
            playlistName: this.state.playlistName,
            playlistDescription: this.state.playlistDescription,
            playlistIsPublic: this.state.playlistIsPublic,
            activeVibes: this.state.activeVibes,
            trackLimit: this.state.trackLimit
        };
        try {
            sessionStorage.setItem('terahz_state', JSON.stringify(toSave));
        } catch (e) { /* storage full or unavailable */ }
    }

    restoreState() {
        try {
            const saved = sessionStorage.getItem('terahz_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.setState({
                    searchMode: parsed.searchMode || 'song',
                    songSeedList: parsed.songSeedList || [],
                    artistSeedList: parsed.artistSeedList || [],
                    genreSeedList: parsed.genreSeedList || [],
                    recommendedTracks: parsed.recommendedTracks || [],
                    playlistTracks: parsed.playlistTracks || [],
                    playlistName: parsed.playlistName || '',
                    playlistDescription: parsed.playlistDescription || '',
                    playlistIsPublic: parsed.playlistIsPublic !== undefined ? parsed.playlistIsPublic : true,
                    activeVibes: parsed.activeVibes || [],
                    trackLimit: parsed.trackLimit || 30
                });
                sessionStorage.removeItem('terahz_state');
            }
        } catch (e) { /* parse error or unavailable */ }
    }

    seedSongSelected(song) {
        let songSeedList = [...this.state.songSeedList];
        let index = songSeedList.findIndex(obj => obj.id === song.id);
        let deselectedSong = '';
        if (index !== -1) {
            songSeedList.splice(index, 1);
            deselectedSong = song.id;
        } else {
            songSeedList.push(song);
        }
        this.setState({ songSeedList, songDeselected: deselectedSong });
    }

    seedArtistSelected(artist) {
        let artistSeedList = [...this.state.artistSeedList];
        let index = artistSeedList.findIndex(obj => obj.id === artist.id);
        let deselectedArtist = '';
        if (index !== -1) {
            artistSeedList.splice(index, 1);
            deselectedArtist = artist.id;
        } else {
            artistSeedList.push(artist);
        }
        this.setState({ artistSeedList, artistDeselected: deselectedArtist });
    }

    seedGenreSelected(genre) {
        let genreSeedList = [...this.state.genreSeedList];
        let index = genreSeedList.findIndex(obj => obj.id === genre.id);
        if (index !== -1) {
            genreSeedList.splice(index, 1);
        } else {
            genreSeedList.push(genre);
        }
        this.setState({ genreSeedList });
    }

    handleGenerate() {
        const { songSeedList, artistSeedList, genreSeedList, activeVibes, trackLimit } = this.state;
        const params = { limit: trackLimit };

        if (songSeedList.length > 0) params.seed_tracks = songSeedList.map(s => s.id).slice(0, 5).join(',');
        if (artistSeedList.length > 0) params.seed_artists = artistSeedList.map(a => a.id).slice(0, 5).join(',');
        if (genreSeedList.length > 0) params.seed_genres = genreSeedList.map(g => g.id).slice(0, 5).join(',');
        if (activeVibes.length > 0) params.mood_tags = activeVibes.join(',');

        const hasSeeds = songSeedList.length + artistSeedList.length + genreSeedList.length > 0;
        if (!hasSeeds) {
            this.setState({ recommendationError: 'Add at least one seed first.' });
            return;
        }

        this.setState({ loadingRecommendations: true, recommendationError: '' });

        const qs = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => k + '=' + encodeURIComponent(v))
            .join('&');

        backendRequest.get('getRecommendations?' + qs, (data) => {
            if (data && data.tracks) {
                this.setState({ recommendedTracks: data.tracks, loadingRecommendations: false }, () => {
                    this.scrollToRecs();
                });
            } else {
                this.setState({
                    loadingRecommendations: false,
                    recommendationError: data.error ? data.error.message : 'Failed to get recommendations.'
                });
            }
        });
    }

    addTrackToPlaylist(track, evt) {
        if (!this.state.playlistTracks.find(t => t.id === track.id)) {
            // Fly animation: capture the source position
            if (evt && evt.currentTarget) {
                const btn = evt.currentTarget;
                const rect = btn.getBoundingClientRect();
                this.setState({
                    flyingTrack: {
                        name: track.name,
                        x: rect.left,
                        y: rect.top
                    }
                });
                setTimeout(() => this.setState({ flyingTrack: null }), 600);
            }
            this.setState(prev => ({
                playlistTracks: [...prev.playlistTracks, track]
            }), () => {
                // Re-check section visibility so floating nav appears immediately
                setTimeout(() => { this._rafId = null; this.handleScroll(); }, 50);
            });
        }
    }

    addAllToPlaylist() {
        const ids = new Set(this.state.playlistTracks.map(t => t.id));
        const add = this.state.recommendedTracks.filter(t => !ids.has(t.id));
        this.setState({ playlistTracks: [...this.state.playlistTracks, ...add] }, () => {
            this.scrollToPlaylist();
        });
    }

    removeTrackFromPlaylist(trackId) {
        this.setState({ playlistTracks: this.state.playlistTracks.filter(t => t.id !== trackId) });
    }

    clearPlaylist() {
        this.setState({
            playlistTracks: [],
            recommendedTracks: [],
            playlistName: '',
            playlistDescription: '',
            playlistIsPublic: true
        });
    }

    renderSeedPills() {
        const { songSeedList, artistSeedList, genreSeedList } = this.state;
        const pills = [];
        songSeedList.forEach(s => pills.push({ type: 'song', label: s.name, id: s.id, obj: s }));
        artistSeedList.forEach(a => pills.push({ type: 'artist', label: a.name, id: a.id, obj: a }));
        genreSeedList.forEach(g => pills.push({ type: 'genre', label: g.name, id: g.id, obj: g }));
        if (pills.length === 0) return null;

        return (
            <div className="seedPills">
                <span className="seedPillsLabel">Seeds:</span>
                {pills.map(p => (
                    <span key={p.type + '-' + p.id} className={'pill pill-' + p.type}>
                        <span className="pillIcon">{p.type === 'song' ? '♪' : p.type === 'artist' ? '★' : '◆'}</span>
                        {p.label}
                        <button className="pillX" onClick={() => {
                            if (p.type === 'song') this.seedSongSelected(p.obj);
                            else if (p.type === 'artist') this.seedArtistSelected(p.obj);
                            else this.seedGenreSelected(p.obj);
                        }}>×</button>
                    </span>
                ))}
            </div>
        );
    }

    renderTrackRow(track, showAdd) {
        const { playlistTracks } = this.state;
        const inPlaylist = playlistTracks.some(t => t.id === track.id);
        const artists = track.artists ? track.artists.map(a => a.name).join(', ') : '';
        const img = track.album && track.album.images
            ? (track.album.images[2] || track.album.images[0] || {}).url
            : '';
        const dur = track.duration_ms ? fmtMs(track.duration_ms) : '';

        return (
            <div key={track.id} className="trkRow">
                {img && <img src={img} alt="" className="trkImg" />}
                <div className="trkInfo">
                    <div className="trkName">{track.name}</div>
                    <div className="trkArtist">{artists}</div>
                </div>
                <div className="trkDur">{dur}</div>
                {showAdd && (
                    <button
                        className={'trkAdd' + (inPlaylist ? ' trkAdded' : '')}
                        onClick={(e) => this.addTrackToPlaylist(track, e)}
                        disabled={inPlaylist}
                    >
                        {inPlaylist ? '✓' : '+'}
                    </button>
                )}
            </div>
        );
    }

    toggleVibe(vibe) {
        this.setState(prev => {
            const active = prev.activeVibes.includes(vibe)
                ? prev.activeVibes.filter(v => v !== vibe)
                : [...prev.activeVibes, vibe];
            return { activeVibes: active };
        });
    }

    renderVibePanel() {
        const { showVibes, activeVibes } = this.state;
        const VIBES = [
            { id: 'danceable',  label: 'Danceable',  icon: '💃' },
            { id: 'energetic',  label: 'Energetic',  icon: '⚡' },
            { id: 'chill',      label: 'Chill',      icon: '🌊' },
            { id: 'acoustic',   label: 'Acoustic',   icon: '🎸' },
            { id: 'upbeat',     label: 'Upbeat',     icon: '☀️' },
            { id: 'melancholy', label: 'Melancholy', icon: '🌧️' },
            { id: 'fast',       label: 'Fast BPM',   icon: '🏃' },
            { id: 'slow',       label: 'Slow BPM',   icon: '🐢' },
            { id: 'instrumental', label: 'Instrumental', icon: '🎹' },
            { id: 'vocal',      label: 'Vocal',      icon: '🎤' },
        ];

        return (
            <div className="vibeSection">
                <button
                    className={'vibeToggle' + (showVibes ? ' vibeToggleOpen' : '')}
                    onClick={() => this.setState(prev => ({ showVibes: !prev.showVibes }))}
                >
                    <span className="vibeToggleLabel">
                        🎛️ Fine-tune vibes
                        {activeVibes.length > 0 && <span className="vibeCount">{activeVibes.length}</span>}
                    </span>
                    <span className="vibeChevron">{showVibes ? '▲' : '▼'}</span>
                </button>
                {showVibes && (
                    <div className="vibeGrid">
                        {VIBES.map(v => (
                            <button
                                key={v.id}
                                className={'vibeChip' + (activeVibes.includes(v.id) ? ' vibeChipActive' : '')}
                                onClick={() => this.toggleVibe(v.id)}
                            >
                                <span className="vibeChipIcon">{v.icon}</span>
                                {v.label}
                            </button>
                        ))}
                        {activeVibes.length > 0 && (
                            <button className="vibeClear" onClick={() => this.setState({ activeVibes: [] })}>
                                Clear all
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    renderWelcomeHero() {
        return (
            <div className="welcomeHero">
                <svg className="heroWave" viewBox="0 0 120 40" width="80" height="28">
                    <path d="M4 20 Q18 2, 32 20 Q46 38, 60 20 Q74 2, 88 20 Q102 38, 116 20" fill="none" stroke="var(--green)" strokeWidth="4" strokeLinecap="round" opacity=".6"/>
                </svg>
                <h2 className="heroTitle">Discover your next favorite playlist</h2>
                <p className="heroDesc">
                    Search for songs, artists, or genres you love — TeraHz finds
                    similar tracks and helps you build the perfect Spotify playlist.
                </p>
                <div className="heroSteps">
                    <div className="heroStep">
                        <span className="heroStepNum">1</span>
                        <span>Search &amp; pick seeds</span>
                    </div>
                    <div className="heroStepArrow">→</div>
                    <div className="heroStep">
                        <span className="heroStepNum">2</span>
                        <span>Generate recommendations</span>
                    </div>
                    <div className="heroStepArrow">→</div>
                    <div className="heroStep">
                        <span className="heroStepNum">3</span>
                        <span>Build &amp; save your playlist</span>
                    </div>
                </div>
                <p className="heroCta">Start by searching for a song, artist, or genre above ↑</p>
            </div>
        );
    }

    render() {
        const {
            searchMode, songDeselected, artistDeselected,
            genreSeedList,
            recommendedTracks, loadingRecommendations, recommendationError,
            playlistTracks, songSeedList, artistSeedList,
            flyingTrack, recsVisible, playlistVisible
        } = this.state;
        const { authenticated, onLogin } = this.props;
        const totalSeeds = songSeedList.length + artistSeedList.length + genreSeedList.length;
        const showPlaylist = playlistTracks.length > 0;
        const isBlank = totalSeeds === 0 && recommendedTracks.length === 0 && playlistTracks.length === 0;
        const hasRecs = recommendedTracks.length > 0;

        return (
            <div className={"mainLayout" + (showPlaylist ? '' : ' singlePanel')} ref={this.layoutRef}>
                {/* FLYING TRACK ANIMATION */}
                {flyingTrack && (
                    <div className="flyTrack" style={{ left: flyingTrack.x, top: flyingTrack.y }}>
                        <span className="flyTrackLabel">♪ {flyingTrack.name}</span>
                    </div>
                )}

                {/* FLOATING SECTION NAV */}
                {(hasRecs || showPlaylist) && (
                    <div className="floatingNav">
                        {hasRecs && !recsVisible && (
                            <button className="floatingNavBtn floatingNavRecs" onClick={() => this.scrollToRecs()}>
                                ♪ Recommendations
                                <span className="floatingNavBadge">{recommendedTracks.length}</span>
                            </button>
                        )}
                        {showPlaylist && !playlistVisible && (
                            <button className="floatingNavBtn floatingNavPlaylist" onClick={() => this.scrollToPlaylist()}>
                                ▶ Playlist
                                <span className="floatingNavBadge">{playlistTracks.length}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* LEFT PANEL */}
                <div className="panelLeft">
                    <div className="searchTabs">
                        {['song', 'artist', 'genre'].map(m => (
                            <button
                                key={m}
                                className={'sTab' + (searchMode === m ? ' sTabOn' : '')}
                                onClick={() => this.setState({ searchMode: m })}
                            >
                                {m === 'song' ? '♪ Songs' : m === 'artist' ? '★ Artists' : '◆ Genres'}
                            </button>
                        ))}
                    </div>

                    <div className="searchArea">
                        {searchMode === 'song' && <SpotifySongSearch songSelected={this.seedSongSelected} idDeselected={songDeselected} />}
                        {searchMode === 'artist' && <SpotifyArtistSearch artistSelected={this.seedArtistSelected} idDeselected={artistDeselected} />}
                        {searchMode === 'genre' && <GenreSelector onGenreSelected={this.seedGenreSelected} selectedGenres={genreSeedList} />}
                    </div>

                    {this.renderSeedPills()}

                    {/* Vibe tuning — only when seeds exist */}
                    {totalSeeds > 0 && this.renderVibePanel()}

                    {/* Generate Button — only when seeds exist */}
                    {totalSeeds > 0 && (
                        <div className="tuneBar">
                            <div className="genRow">
                                <button
                                    className="genBtn genBtnFull"
                                    onClick={() => this.handleGenerate()}
                                    disabled={loadingRecommendations}
                                >
                                    {loadingRecommendations ? 'Finding tracks...' : 'Generate Recommendations'}
                                    {!loadingRecommendations && <span className="genCount">{totalSeeds}</span>}
                                </button>
                                <select
                                    className="trackLimitSelect"
                                    value={this.state.trackLimit}
                                    onChange={(e) => this.setState({ trackLimit: parseInt(e.target.value) })}
                                    disabled={loadingRecommendations}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                    <option value={75}>75</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    <div className="resultsArea" ref={this.recsRef}>
                        {loadingRecommendations && <div className="rMsg"><span className="spin"></span> Finding tracks...</div>}
                        {recommendationError && <div className="rMsg rErr">{recommendationError}</div>}
                        {!loadingRecommendations && !recommendationError && recommendedTracks.length > 0 && (
                            <React.Fragment>
                                <div className="rBar">
                                    <span>{recommendedTracks.length} recommendations</span>
                                    <button className="rAddAll" onClick={this.addAllToPlaylist}>+ Add All</button>
                                </div>
                                {playlistTracks.length === 0 && (
                                    <div className="rHint">Tap <strong>+</strong> to add tracks to your playlist, or <strong>+ Add All</strong> to grab them all.</div>
                                )}
                                <div className="trkList">
                                    {recommendedTracks.map(t => this.renderTrackRow(t, true))}
                                </div>
                            </React.Fragment>
                        )}
                        {!loadingRecommendations && !recommendationError && recommendedTracks.length === 0 && (
                            isBlank ? this.renderWelcomeHero() : (
                                <div className="rMsg rMuted stepHint">
                                    {totalSeeds === 0
                                        ? 'Search and select seeds to get started.'
                                        : '✨ Seeds ready! Hit Generate to discover new tracks.'}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL — only when playlist has tracks */}
                {showPlaylist && (
                    <div className="panelRight panelReveal" ref={this.playlistRef}>
                        <PlaylistBuilder
                            playlistTracks={playlistTracks}
                            authenticated={authenticated}
                            onRemoveTrack={this.removeTrackFromPlaylist}
                            onClear={this.clearPlaylist}
                            onLogin={onLogin}
                            playlistName={this.state.playlistName}
                            playlistDescription={this.state.playlistDescription}
                            playlistIsPublic={this.state.playlistIsPublic}
                            onNameChange={(v) => this.setState({ playlistName: v })}
                            onDescChange={(v) => this.setState({ playlistDescription: v })}
                            onPublicChange={(v) => this.setState({ playlistIsPublic: v })}
                        />
                    </div>
                )}
            </div>
        );
    }
}

function fmtMs(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

export default SiteContent;

