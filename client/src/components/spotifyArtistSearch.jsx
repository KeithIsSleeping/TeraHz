import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';
import debounce from 'lodash/debounce';
import backendRequest from '../api/backendRequest';
import SearchTile from './searchTile'

class SpotifyArtistSearch extends React.Component {
constructor(props) {
    super(props);
    this.state = {
        searchResults : [],
        displayResults : false,
        searchValue: ''
    };

    this.debouncedSubmit = debounce(this.submitText.bind(this), 500);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.onAddArtist = this.onAddArtist.bind(this);
}

submitText() {
    const {searchValue} = this.state;
    if (!searchValue || !searchValue.trim()) return;
    const foo = this;
    backendRequest.get('findArtist?searchText='+encodeURIComponent(searchValue.trim()),function(data){
        let results = [];
        if(data != null){
            if(data.artists != null){
                results=data.artists.items;
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

onAddArtist(artist){
    this.props.artistSelected(artist);
}

render() {

    const {searchValue,displayResults,searchResults} = this.state;
    const placeHolderText = "Enter an artist!";

    const artistDisplay = searchResults.map((result) => {
        return <SearchTile idDeselected={this.props.idDeselected} elementID = {result.id} name = {result.name} image = {result.images} onAdd = {this.onAddArtist}></SearchTile> 
    });

    return (
        <React.Fragment>
        <div className='searchBoxContainer'>
            <input className="searchBox"  placeholder={placeHolderText} onChange={this.handleInputChange} value={searchValue}></input>
        </div>
        {displayResults && artistDisplay
        }
        </React.Fragment>
    );
}

}

SpotifyArtistSearch.propTypes = {
    artistSelected: PropTypes.func.isRequired,
    idDeselected: PropTypes.string.isRequired
}
export default SpotifyArtistSearch;

