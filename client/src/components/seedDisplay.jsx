import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';
import SeedItem from './seedItem';
import SpotifyAuth from './spotifyAuth';

class SeedDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const { songSeedList, artistSeedList, genreSeedList, authenticated, user, onAuthCheck, onLogout } = this.props;

        const songDisplay = songSeedList.map((song) => {
            return <SeedItem key={song.id} name={song.name} id={song.id} onDelete={this.props.onDeleteSong} />;
        });

        const artistDisplay = artistSeedList.map((artist) => {
            return <SeedItem key={artist.id} name={artist.name} id={artist.id} onDelete={this.props.onDeleteArtist} />;
        });

        const genreDisplay = genreSeedList.map((genre) => {
            return <SeedItem key={genre.id} name={genre.name} id={genre.id} onDelete={this.props.onDeleteGenre} />;
        });

        const totalSeeds = songSeedList.length + artistSeedList.length + genreSeedList.length;

        return (
            <div className="seedDisplay">
                <SpotifyAuth
                    authenticated={authenticated}
                    user={user}
                    onAuthCheck={onAuthCheck}
                    onLogout={onLogout}
                />
                <div className="seedSectionTitle">
                    Seeds ({totalSeeds}/5)
                </div>
                {totalSeeds === 0 && (
                    <div className="seedHint">Search for songs, artists, or genres to use as seeds for recommendations.</div>
                )}
                {songSeedList.length > 0 && (
                    <div className="seedSection">
                        <div className="seedLabel">Songs</div>
                        {songDisplay}
                    </div>
                )}
                {artistSeedList.length > 0 && (
                    <div className="seedSection">
                        <div className="seedLabel">Artists</div>
                        {artistDisplay}
                    </div>
                )}
                {genreSeedList.length > 0 && (
                    <div className="seedSection">
                        <div className="seedLabel">Genres</div>
                        {genreDisplay}
                    </div>
                )}
            </div>
        );
    }
}

SeedDisplay.propTypes = {
    songSeedList: PropTypes.array.isRequired,
    artistSeedList: PropTypes.array.isRequired,
    genreSeedList: PropTypes.array.isRequired,
    onDeleteSong: PropTypes.func.isRequired,
    onDeleteArtist: PropTypes.func.isRequired,
    onDeleteGenre: PropTypes.func.isRequired,
    authenticated: PropTypes.bool.isRequired,
    user: PropTypes.object,
    onAuthCheck: PropTypes.func.isRequired,
    onLogout: PropTypes.func.isRequired
};

export default SeedDisplay;

