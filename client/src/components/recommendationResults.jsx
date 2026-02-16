import React from 'react';
import PropTypes from 'prop-types';
import TrackCard from './trackCard';
import '../css/site.css';

class RecommendationResults extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const { tracks, loading, error, onAddToPlaylist, playlistTracks, onAddAllToPlaylist } = this.props;

        if (loading) {
            return <div className="resultsLoading">Finding your perfect tracks...</div>;
        }

        if (error) {
            return <div className="resultsError">{error}</div>;
        }

        if (!tracks || tracks.length === 0) {
            return <div className="resultsEmpty">No recommendations yet. Select your seeds and tune your parameters, then generate!</div>;
        }

        const playlistTrackIds = playlistTracks.map(t => t.id);
        const allInPlaylist = tracks.every(t => playlistTrackIds.includes(t.id));

        return (
            <div className="recommendationResults">
                <div className="resultsHeader">
                    <h3>Recommendations ({tracks.length} tracks)</h3>
                    <button
                        className="addAllButton"
                        onClick={onAddAllToPlaylist}
                        disabled={allInPlaylist}
                    >
                        {allInPlaylist ? 'All Added' : 'Add All to Playlist'}
                    </button>
                </div>
                <div className="trackGrid">
                    {tracks.map((track) => (
                        <TrackCard
                            key={track.id}
                            track={track}
                            onAdd={onAddToPlaylist}
                            inPlaylist={playlistTrackIds.includes(track.id)}
                        />
                    ))}
                </div>
            </div>
        );
    }
}

RecommendationResults.propTypes = {
    tracks: PropTypes.array.isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    onAddToPlaylist: PropTypes.func.isRequired,
    onAddAllToPlaylist: PropTypes.func.isRequired,
    playlistTracks: PropTypes.array.isRequired
};

export default RecommendationResults;
