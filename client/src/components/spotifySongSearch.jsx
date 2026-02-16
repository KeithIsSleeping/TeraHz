import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';
import debounce from 'lodash/debounce';
import backendRequest from '../api/backendRequest';
import SearchTile from './searchTile'

class SpotifySearch extends React.Component {
constructor(props) {
    super(props);
    this.state = {
        searchResults : [],
        displayResults : false,
        searchValue: ''
    };

    this.debouncedSubmit = debounce(this.submitText.bind(this), 500);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.onAddSong = this.onAddSong.bind(this);
}

submitText() {
    const {searchValue} = this.state;
    if (!searchValue || !searchValue.trim()) return;
    const foo = this;
    backendRequest.get('findSong?searchText='+encodeURIComponent(searchValue.trim()),function(data){
        let results = [];
        if(data != null){
            if(data.tracks != null){
                results=data.tracks.items;
            }
        }
        foo.setState({displayResults : true, searchResults: results});
    });
}

handleInputChange(event) {

    const searchValue = event.target.value;
        this.setState({ searchValue }, () => {
        this.setState({displayResults:false})
        this.debouncedSubmit();
    });
}

onAddSong(song){
    this.props.songSelected(song);
}

render() {

    const {searchValue,displayResults,searchResults} = this.state;
    const placeHolderText = "Enter a song!";

    const songDisplay = searchResults.map((result) => {
        const artistName = result.artists ? result.artists.map(a => a.name).join(', ') : '';
        return <SearchTile idDeselected={this.props.idDeselected} key={result.id} elementID = {result.id} name = {result.name} artist = {artistName} image = {result.album.images} onAdd = {this.onAddSong}></SearchTile> 
    });

    return (
        <React.Fragment>
        <div className='searchBoxContainer'>
            <input className="searchBox" placeholder={placeHolderText} onChange={this.handleInputChange} value={searchValue}></input>
        </div>
        {displayResults && songDisplay
        }
        </React.Fragment>
    );
}

}

SpotifySearch.propTypes = {
    songSelected: PropTypes.func.isRequired,
    idDeselected: PropTypes.string.isRequired
}

export default SpotifySearch;

