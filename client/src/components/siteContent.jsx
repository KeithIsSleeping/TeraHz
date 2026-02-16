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
            playlistPanelOpen: false,
            playlistName: '',
            playlistDescription: '',
            playlistIsPublic: true,
            showVibes: true,
            trackLimit: 30,
            popularityRange: [0, 100],
            decadeFilter: [],
            excludeExplicit: false,
            sortBy: 'default',
            durationFilter: [],
            flyingTrack: null,
            seedsScrolledPast: false,
            vibesScrolledPast: false,
            recsScrolledPast: false,
            playlistScrolledPast: false,
            playlistInView: false
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
        this.seedsRef = React.createRef();
        this.vibesRef = React.createRef();
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
            const headerH = 56; // height of appHeader
            // Track whether each section's top has scrolled above the header
            let seedsPast = false;
            let vibesPast = false;
            let recsPast = false;
            let plPast = false;
            let plInView = false;
            if (this.seedsRef.current) {
                const r = this.seedsRef.current.getBoundingClientRect();
                seedsPast = r.top < headerH;
            }
            if (this.vibesRef.current) {
                const r = this.vibesRef.current.getBoundingClientRect();
                vibesPast = r.top < headerH;
            }
            if (this.recsRef.current) {
                const r = this.recsRef.current.getBoundingClientRect();
                recsPast = r.top < headerH;
            }
            if (this.playlistRef.current) {
                const r = this.playlistRef.current.getBoundingClientRect();
                plPast = r.top < headerH;
                plInView = r.top < vp && r.bottom > 0;
            }
            if (seedsPast !== this.state.seedsScrolledPast || vibesPast !== this.state.vibesScrolledPast || recsPast !== this.state.recsScrolledPast || plPast !== this.state.playlistScrolledPast || plInView !== this.state.playlistInView) {
                this.setState({ seedsScrolledPast: seedsPast, vibesScrolledPast: vibesPast, recsScrolledPast: recsPast, playlistScrolledPast: plPast, playlistInView: plInView });
            }
        });
    }

    scrollToSeeds() {
        if (this.seedsRef.current) {
            this.seedsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this._scheduleScrollRecheck();
        }
    }

    scrollToVibes() {
        if (this.vibesRef.current) {
            this.vibesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this._scheduleScrollRecheck();
        }
    }

    scrollToRecs() {
        if (this.recsRef.current) {
            this.recsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this._scheduleScrollRecheck();
        }
    }

    scrollToPlaylist() {
        if (this.playlistRef.current) {
            this.playlistRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            this._scheduleScrollRecheck();
        }
    }

    _scheduleScrollRecheck() {
        // Force re-check visibility after smooth scroll settles
        [150, 350, 600].forEach(ms => {
            setTimeout(() => { this._rafId = null; this.handleScroll(); }, ms);
        });
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
            trackLimit: this.state.trackLimit,
            popularityRange: this.state.popularityRange,
            decadeFilter: this.state.decadeFilter,
            excludeExplicit: this.state.excludeExplicit,
            sortBy: this.state.sortBy,
            durationFilter: this.state.durationFilter,
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
                    playlistPanelOpen: (parsed.playlistTracks || []).length > 0,
                    playlistName: parsed.playlistName || '',
                    playlistDescription: parsed.playlistDescription || '',
                    playlistIsPublic: parsed.playlistIsPublic !== undefined ? parsed.playlistIsPublic : true,
                    trackLimit: parsed.trackLimit || 30,
                    popularityRange: parsed.popularityRange || [0, 100],
                    decadeFilter: Array.isArray(parsed.decadeFilter) ? parsed.decadeFilter : [],
                    excludeExplicit: parsed.excludeExplicit || false,
                    sortBy: parsed.sortBy || 'default',
                    durationFilter: Array.isArray(parsed.durationFilter) ? parsed.durationFilter : []
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
        const { songSeedList, artistSeedList, genreSeedList, trackLimit } = this.state;
        const params = { limit: trackLimit };

        if (songSeedList.length > 0) params.seed_tracks = songSeedList.map(s => s.id).slice(0, 5).join(',');
        if (artistSeedList.length > 0) params.seed_artists = artistSeedList.map(a => a.id).slice(0, 5).join(',');
        if (genreSeedList.length > 0) params.seed_genres = genreSeedList.map(g => g.id).slice(0, 5).join(',');

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
                playlistTracks: [...prev.playlistTracks, track],
                playlistPanelOpen: true
            }), () => {
                // Re-check section visibility so floating nav appears immediately
                setTimeout(() => { this._rafId = null; this.handleScroll(); }, 50);
            });
        }
    }

    addAllToPlaylist() {
        const ids = new Set(this.state.playlistTracks.map(t => t.id));
        const filtered = this.getFilteredTracks();
        const add = filtered.filter(t => !ids.has(t.id));
        this.setState({ playlistTracks: [...this.state.playlistTracks, ...add], playlistPanelOpen: true }, () => {
            this.scrollToPlaylist();
        });
    }

    removeTrackFromPlaylist(trackId) {
        this.setState({ playlistTracks: this.state.playlistTracks.filter(t => t.id !== trackId) });
    }

    reorderPlaylist = (fromIndex, toIndex) => {
        this.setState(prev => {
            const tracks = [...prev.playlistTracks];
            const [moved] = tracks.splice(fromIndex, 1);
            tracks.splice(toIndex, 0, moved);
            return { playlistTracks: tracks };
        });
    };

    clearPlaylist() {
        this.setState({
            playlistTracks: [],
            playlistName: '',
            playlistDescription: ''
        });
    }

    closePlaylistPanel = () => {
        this.setState({
            playlistTracks: [],
            playlistPanelOpen: false,
            playlistName: '',
            playlistDescription: '',
            playlistIsPublic: true,
            recommendedTracks: []
        });
    };

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
                        {inPlaylist ? '✓' : ''}
                    </button>
                )}
            </div>
        );
    }

    renderVibePanel() {
        const { showVibes, popularityRange, decadeFilter, excludeExplicit, sortBy, durationFilter } = this.state;

        const DECADES = [
            { id: '2020s', label: '2020s' },
            { id: '2010s', label: '2010s' },
            { id: '2000s', label: '2000s' },
            { id: '1990s', label: '90s' },
            { id: '1980s', label: '80s' },
            { id: '1970s', label: '70s' },
            { id: 'pre70', label: 'Pre-70s' },
        ];

        const popLabels = (min, max) => {
            if (min === 0 && max === 100) return 'Any';
            if (min >= 70) return 'Mainstream';
            if (max <= 30) return 'Underground';
            if (max <= 60) return 'Indie';
            return min + '–' + max;
        };

        const SORT_OPTIONS = [
            { id: 'default',    label: 'Default' },
            { id: 'random',     label: 'Random' },
            { id: 'pop-high',   label: 'Most Popular' },
            { id: 'pop-low',    label: 'Least Popular' },
            { id: 'newest',     label: 'Newest' },
            { id: 'oldest',     label: 'Oldest' },
            { id: 'name',       label: 'A → Z' },
        ];

        const DURATION_OPTIONS = [
            { id: 'short',  label: 'Short (<3m)' },
            { id: 'medium', label: 'Medium (3–5m)' },
            { id: 'long',   label: 'Long (5–8m)' },
            { id: 'epic',   label: 'Epic (8m+)' },
        ];

        const hasFilters = popularityRange[0] !== 0 || popularityRange[1] !== 100 || decadeFilter.length > 0 || excludeExplicit || sortBy !== 'default' || durationFilter.length > 0;

        return (
            <div className="vibeSection" ref={this.vibesRef}>
                <div className="vibeHeader">
                    <span className="vibeHeaderLabel">🎛️ Fine-tune</span>
                    {hasFilters && (
                        <button className="vibeClear" onClick={() => this.setState({ popularityRange: [0, 100], decadeFilter: [], excludeExplicit: false, sortBy: 'default', durationFilter: [] })}>
                            Reset
                        </button>
                    )}
                </div>
                {showVibes && (
                    <div className="vibePanel">
                        {/* Popularity */}
                        <div className="filterGroup">
                            <div className="filterLabel">
                                <span>Popularity</span>
                                <span className="filterValue">{popLabels(popularityRange[0], popularityRange[1])}</span>
                            </div>
                            <div className="dualSlider">
                                <input
                                    type="range" min="0" max="100" step="5"
                                    value={popularityRange[0]}
                                    className="rangeInput rangeMin"
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        this.setState(prev => ({
                                            popularityRange: [Math.min(v, prev.popularityRange[1] - 5), prev.popularityRange[1]]
                                        }));
                                    }}
                                />
                                <input
                                    type="range" min="0" max="100" step="5"
                                    value={popularityRange[1]}
                                    className="rangeInput rangeMax"
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        this.setState(prev => ({
                                            popularityRange: [prev.popularityRange[0], Math.max(v, prev.popularityRange[0] + 5)]
                                        }));
                                    }}
                                />
                            </div>
                            <div className="sliderLabels">
                                <span>Underground</span>
                                <span>Mainstream</span>
                            </div>
                        </div>

                        {/* Era */}
                        <div className="filterGroup">
                            <div className="filterLabel">
                                <span>Era</span>
                            </div>
                            <div className="decadeGrid">
                                {DECADES.map(d => (
                                    <button
                                        key={d.id}
                                        className={'decadeChip' + (decadeFilter.includes(d.id) ? ' decadeChipActive' : '')}
                                        onClick={() => this.setState(prev => ({
                                            decadeFilter: prev.decadeFilter.includes(d.id)
                                                ? prev.decadeFilter.filter(x => x !== d.id)
                                                : [...prev.decadeFilter, d.id]
                                        }))}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Explicit */}
                        <div className="filterGroup">
                            <label className="filterToggle" onClick={() => this.setState(prev => ({ excludeExplicit: !prev.excludeExplicit }))}>
                                <span className="filterToggleTrack">
                                    <span className={'filterToggleThumb' + (excludeExplicit ? ' filterToggleOn' : '')} />
                                </span>
                                <span>Hide explicit</span>
                            </label>
                        </div>

                        {/* Duration */}
                        <div className="filterGroup">
                            <div className="filterLabel">
                                <span>Duration</span>
                            </div>
                            <div className="decadeGrid">
                                {DURATION_OPTIONS.map(d => (
                                    <button
                                        key={d.id}
                                        className={'decadeChip' + (durationFilter.includes(d.id) ? ' decadeChipActive' : '')}
                                        onClick={() => this.setState(prev => ({
                                            durationFilter: prev.durationFilter.includes(d.id)
                                                ? prev.durationFilter.filter(x => x !== d.id)
                                                : [...prev.durationFilter, d.id]
                                        }))}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="filterGroup">
                            <div className="filterLabel">
                                <span>Sort by</span>
                            </div>
                            <div className="decadeGrid">
                                {SORT_OPTIONS.map(s => (
                                    <button
                                        key={s.id}
                                        className={'decadeChip' + (sortBy === s.id ? ' decadeChipActive' : '')}
                                        onClick={() => this.setState({ sortBy: s.id })}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        );
    }

    getFilteredTracks() {
        const { recommendedTracks, popularityRange, decadeFilter, excludeExplicit, sortBy, durationFilter } = this.state;
        const [minPop, maxPop] = popularityRange;
        const hasPopFilter = minPop !== 0 || maxPop !== 100;
        const hasDecadeFilter = decadeFilter.length > 0;
        const hasDurationFilter = durationFilter.length > 0;
        const hasAnyFilter = hasPopFilter || hasDecadeFilter || excludeExplicit || hasDurationFilter;

        let tracks = hasAnyFilter ? recommendedTracks.filter(track => {
            // Explicit filter
            if (excludeExplicit && track.explicit) return false;
            // Popularity filter
            if (hasPopFilter) {
                const pop = track.popularity || 0;
                if (pop < minPop || pop > maxPop) return false;
            }
            // Decade filter (multi-select — track matches if it falls in ANY selected era)
            if (hasDecadeFilter) {
                const releaseDate = track.album && track.album.release_date;
                if (!releaseDate) return false;
                const year = parseInt(releaseDate.substring(0, 4));
                if (isNaN(year)) return false;
                const matchesEra = decadeFilter.some(era => {
                    switch (era) {
                        case '2020s': return year >= 2020;
                        case '2010s': return year >= 2010 && year < 2020;
                        case '2000s': return year >= 2000 && year < 2010;
                        case '1990s': return year >= 1990 && year < 2000;
                        case '1980s': return year >= 1980 && year < 1990;
                        case '1970s': return year >= 1970 && year < 1980;
                        case 'pre70':  return year < 1970;
                        default: return false;
                    }
                });
                if (!matchesEra) return false;
            }
            // Duration filter (multi-select — track matches if it falls in ANY selected range)
            if (hasDurationFilter) {
                const ms = track.duration_ms || 0;
                const matchesDur = durationFilter.some(dur => {
                    switch (dur) {
                        case 'short':  return ms < 180000;
                        case 'medium': return ms >= 180000 && ms < 300000;
                        case 'long':   return ms >= 300000 && ms < 480000;
                        case 'epic':   return ms >= 480000;
                        default: return false;
                    }
                });
                if (!matchesDur) return false;
            }
            return true;
        }) : [...recommendedTracks];

        // Sort
        if (sortBy !== 'default') {
            if (sortBy === 'random') {
                tracks = [...tracks];
                for (let i = tracks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
                }
            } else {
                tracks = [...tracks].sort((a, b) => {
                switch (sortBy) {
                    case 'pop-high': return (b.popularity || 0) - (a.popularity || 0);
                    case 'pop-low':  return (a.popularity || 0) - (b.popularity || 0);
                    case 'newest': {
                        const da = (a.album && a.album.release_date) || '';
                        const db = (b.album && b.album.release_date) || '';
                        return db.localeCompare(da);
                    }
                    case 'oldest': {
                        const da = (a.album && a.album.release_date) || 'zzzz';
                        const db = (b.album && b.album.release_date) || 'zzzz';
                        return da.localeCompare(db);
                    }
                    case 'name': return (a.name || '').localeCompare(b.name || '');
                    default: return 0;
                }
            });
            }
        }

        return tracks;
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
            flyingTrack, seedsScrolledPast, vibesScrolledPast, recsScrolledPast, playlistScrolledPast, playlistInView
        } = this.state;
        const { authenticated, onLogin } = this.props;
        const totalSeeds = songSeedList.length + artistSeedList.length + genreSeedList.length;
        const showPlaylist = this.state.playlistPanelOpen;
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

                {/* CHEVRON BREADCRUMB NAV (mobile) */}
                {(seedsScrolledPast || (totalSeeds > 0 && vibesScrolledPast) || (hasRecs && recsScrolledPast) || (showPlaylist && playlistScrolledPast)) && (
                    <nav className="breadcrumbBar">
                        {seedsScrolledPast && (
                            <button className="bcItem bcSeeds" onClick={() => this.scrollToSeeds()}>
                                Seeds
                            </button>
                        )}
                        {totalSeeds > 0 && vibesScrolledPast && (
                            <button className="bcItem bcVibes" onClick={() => this.scrollToVibes()}>
                                Tune
                            </button>
                        )}
                        {hasRecs && recsScrolledPast && (
                            <button className="bcItem bcRecs" onClick={() => this.scrollToRecs()}>
                                Recs
                            </button>
                        )}
                        {showPlaylist && playlistScrolledPast && (
                            <button className="bcItem bcPlaylist" onClick={() => this.scrollToPlaylist()}>
                                Playlist
                            </button>
                        )}
                    </nav>
                )}

                {/* LEFT PANEL */}
                <div className="panelLeft">
                    <div className="seedsSection" ref={this.seedsRef}>
                    <div className="mobileSectionLabel">Search &amp; Pick Seeds</div>
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

                    </div>{/* end seedsSection */}

                    {/* Generate Button — sticky footer, only when seeds exist */}
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
                        {!loadingRecommendations && !recommendationError && recommendedTracks.length > 0 && (() => {
                            const filtered = this.getFilteredTracks();
                            const isFiltered = filtered.length !== recommendedTracks.length;
                            return (
                            <React.Fragment>
                                <div className="rBar">
                                    <span>{filtered.length} recommendation{filtered.length !== 1 ? 's' : ''}
                                        {isFiltered && <span className="rFilterNote"> (filtered from {recommendedTracks.length})</span>}
                                    </span>
                                    <button className="rAddAll" onClick={this.addAllToPlaylist}>+ Add All</button>
                                </div>
                                {filtered.length === 0 && (
                                    <div className="rMsg rMuted">No tracks match your filters. Try adjusting popularity or era.</div>
                                )}
                                {filtered.length > 0 && playlistTracks.length === 0 && (
                                    <div className="rHint">Tap <strong>+</strong> to add tracks to your playlist, or <strong>+ Add All</strong> to grab them all.</div>
                                )}
                                <div className="trkList">
                                    {filtered.map(t => this.renderTrackRow(t, true))}
                                </div>
                            </React.Fragment>
                            );
                        })()}
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
                            onReorder={this.reorderPlaylist}
                            onClear={this.clearPlaylist}
                            onClose={this.closePlaylistPanel}
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

                {/* PLAYLIST FOOTER BAR (mobile) — visible when playlist has tracks but section is not in view */}
                {showPlaylist && !playlistInView && (
                    <div className="playlistFooter" onClick={() => this.scrollToPlaylist()}>
                        <span className="playlistFooterIcon">▶</span>
                        <span className="playlistFooterLabel">Playlist</span>
                        <span className="playlistFooterBadge">{playlistTracks.length} {playlistTracks.length === 1 ? 'track' : 'tracks'}</span>
                        <span className="playlistFooterArrow">↓</span>
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

