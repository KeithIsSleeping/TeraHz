import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';

class TrackCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            playing: false,
            audio: null
        };
        this.togglePreview = this.togglePreview.bind(this);
        this.handleAdd = this.handleAdd.bind(this);
    }

    componentWillUnmount() {
        if (this.state.audio) {
            this.state.audio.pause();
        }
    }

    togglePreview() {
        const { track } = this.props;
        const { playing, audio } = this.state;

        if (!track.preview_url) return;

        if (playing && audio) {
            audio.pause();
            this.setState({ playing: false });
        } else {
            if (audio) audio.pause();
            const newAudio = new Audio(track.preview_url);
            newAudio.volume = 0.3;
            newAudio.play();
            newAudio.onended = () => this.setState({ playing: false });
            this.setState({ playing: true, audio: newAudio });
        }
    }

    handleAdd() {
        const { track, inPlaylist } = this.props;
        if (!inPlaylist) {
            this.props.onAdd(track);
        }
    }

    render() {
        const { track, inPlaylist } = this.props;
        const { playing } = this.state;
        const album = track.album || {};
        const artists = track.artists ? track.artists.map(a => a.name).join(', ') : 'Unknown';
        const image = album.images && album.images.length > 1 ? album.images[1].url : (album.images && album.images[0] ? album.images[0].url : '');
        const duration = track.duration_ms ? formatDuration(track.duration_ms) : '';
        const hasPreview = !!track.preview_url;

        return (
            <div className="trackCard">
                <div className="trackCardImage" style={{ backgroundImage: `url(${image})` }}>
                    {hasPreview && (
                        <button className="previewButton" onClick={this.togglePreview}>
                            {playing ? '⏸' : '▶'}
                        </button>
                    )}
                </div>
                <div className="trackCardInfo">
                    <div className="trackCardName" title={track.name}>{track.name}</div>
                    <div className="trackCardArtist" title={artists}>{artists}</div>
                    <div className="trackCardMeta">
                        <span className="trackCardAlbum" title={album.name}>{album.name}</span>
                        <span className="trackCardDuration">{duration}</span>
                    </div>
                    {track.popularity !== undefined && (
                        <div className="trackCardPopularity">
                            <div className="popularityBar">
                                <div className="popularityFill" style={{ width: track.popularity + '%' }}></div>
                            </div>
                            <span className="popularityLabel">{track.popularity}</span>
                        </div>
                    )}
                </div>
                <button
                    className={inPlaylist ? 'trackAddButton trackAdded' : 'trackAddButton'}
                    onClick={this.handleAdd}
                    disabled={inPlaylist}
                >
                    {inPlaylist ? '✓' : '+'}
                </button>
            </div>
        );
    }
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

TrackCard.propTypes = {
    track: PropTypes.object.isRequired,
    onAdd: PropTypes.func.isRequired,
    inPlaylist: PropTypes.bool.isRequired
};

export default TrackCard;
