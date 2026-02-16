import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';

const GENRE_CATEGORIES = [
    {
        name: 'Rock',
        icon: '🎸',
        genres: ['alt-rock', 'alternative', 'emo', 'goth', 'grunge', 'guitar', 'hard-rock', 'indie', 'j-rock', 'psych-rock', 'punk', 'punk-rock', 'rock', 'rock-n-roll', 'rockabilly']
    },
    {
        name: 'Metal',
        icon: '🤘',
        genres: ['black-metal', 'death-metal', 'grindcore', 'hardcore', 'heavy-metal', 'industrial', 'metal', 'metal-misc', 'metalcore']
    },
    {
        name: 'Pop',
        icon: '🎤',
        genres: ['cantopop', 'indie-pop', 'j-idol', 'j-pop', 'k-pop', 'mandopop', 'pop', 'power-pop', 'synth-pop']
    },
    {
        name: 'Electronic',
        icon: '🎛️',
        genres: ['ambient', 'breakbeat', 'chicago-house', 'deep-house', 'detroit-techno', 'drum-and-bass', 'dub', 'dubstep', 'edm', 'electro', 'electronic', 'hardstyle', 'house', 'idm', 'minimal-techno', 'post-dubstep', 'progressive-house', 'techno', 'trance', 'trip-hop']
    },
    {
        name: 'Dance & Club',
        icon: '🪩',
        genres: ['club', 'dance', 'dancehall', 'disco', 'funk', 'garage', 'groove', 'j-dance', 'party']
    },
    {
        name: 'Hip-Hop & R&B',
        icon: '🎙️',
        genres: ['hip-hop', 'r-n-b']
    },
    {
        name: 'Jazz, Blues & Soul',
        icon: '🎷',
        genres: ['blues', 'bluegrass', 'jazz', 'soul']
    },
    {
        name: 'Latin',
        icon: '💃',
        genres: ['bossanova', 'brazil', 'forro', 'latin', 'latino', 'mpb', 'pagode', 'reggaeton', 'salsa', 'samba', 'sertanejo', 'tango']
    },
    {
        name: 'Country & Folk',
        icon: '🪕',
        genres: ['acoustic', 'country', 'folk', 'honky-tonk', 'singer-songwriter', 'songwriter']
    },
    {
        name: 'Reggae & Ska',
        icon: '🌴',
        genres: ['reggae', 'ska']
    },
    {
        name: 'World',
        icon: '🌍',
        genres: ['afrobeat', 'anime', 'british', 'french', 'german', 'indian', 'iranian', 'malay', 'philippines-opm', 'spanish', 'swedish', 'turkish', 'world-music']
    },
    {
        name: 'Classical',
        icon: '🎻',
        genres: ['classical', 'gospel', 'new-age', 'opera', 'piano', 'show-tunes']
    },
    {
        name: 'Mood & Activity',
        icon: '✨',
        genres: ['chill', 'happy', 'rainy-day', 'road-trip', 'romance', 'sad', 'sleep', 'study', 'summer', 'work-out']
    },
    {
        name: 'Film & Other',
        icon: '🎬',
        genres: ['children', 'comedy', 'disney', 'holidays', 'kids', 'movies', 'new-release', 'pop-film', 'soundtracks']
    }
];

class GenreSelector extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            searchValue: '',
            expandedCategories: {}
        };
        this.handleSearch = this.handleSearch.bind(this);
        this.toggleGenre = this.toggleGenre.bind(this);
        this.toggleCategory = this.toggleCategory.bind(this);
    }

    handleSearch(event) {
        this.setState({ searchValue: event.target.value });
    }

    toggleGenre(genre) {
        this.props.onGenreSelected({ id: genre, name: genre });
    }

    toggleCategory(categoryName) {
        this.setState(prev => ({
            expandedCategories: {
                ...prev.expandedCategories,
                [categoryName]: !prev.expandedCategories[categoryName]
            }
        }));
    }

    render() {
        const { searchValue, expandedCategories } = this.state;
        const { selectedGenres } = this.props;
        const selectedIds = selectedGenres.map(g => g.id);
        const filter = searchValue.toLowerCase();
        const isFiltering = filter.length > 0;

        return (
            <React.Fragment>
                <div className="searchBoxContainer">
                    <input
                        className="searchBox"
                        placeholder="Search genres..."
                        onChange={this.handleSearch}
                        value={searchValue}
                    />
                </div>
                <div className="genreCategoryList">
                    {GENRE_CATEGORIES.map(cat => {
                        const matchingGenres = isFiltering
                            ? cat.genres.filter(g => g.includes(filter))
                            : cat.genres;

                        if (isFiltering && matchingGenres.length === 0) return null;

                        const isExpanded = isFiltering || expandedCategories[cat.name];
                        const selectedInCat = cat.genres.filter(g => selectedIds.includes(g));

                        return (
                            <div key={cat.name} className="genreCategory">
                                <div
                                    className="genreCategoryHeader"
                                    onClick={() => !isFiltering && this.toggleCategory(cat.name)}
                                >
                                    <div className="genreCategoryTitle">
                                        <span className="genreCategoryIcon">{cat.icon}</span>
                                        <span className="genreCategoryName">{cat.name}</span>
                                        {selectedInCat.length > 0 && (
                                            <span className="genreCategoryBadge">{selectedInCat.length}</span>
                                        )}
                                    </div>
                                    {!isFiltering && (
                                        <span className={`genreCategoryArrow ${isExpanded ? 'expanded' : ''}`}>
                                            ›
                                        </span>
                                    )}
                                </div>
                                {isExpanded && (
                                    <div className="genreGrid">
                                        {matchingGenres.map(genre => {
                                            const isSelected = selectedIds.includes(genre);
                                            return (
                                                <div
                                                    key={genre}
                                                    className={isSelected ? 'genreChip genreChipSelected' : 'genreChip'}
                                                    onClick={() => this.toggleGenre(genre)}
                                                >
                                                    {genre}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </React.Fragment>
        );
    }
}

GenreSelector.propTypes = {
    onGenreSelected: PropTypes.func.isRequired,
    selectedGenres: PropTypes.array.isRequired
};

export default GenreSelector;
