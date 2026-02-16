import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';

class SearchTile extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            clicked:false
        };

        this.addItem = this.addItem.bind(this);
        this.unClick = this.unClick.bind(this);
    }

    unClick(){
        this.setState({clicked:false});
    }


    addItem(){
        const {elementID,name} = this.props;
        const {clicked} = this.state;
        let clickState = true;
        this.props.onAdd({id:elementID,name:name});
        if(clicked){
            clickState = false;
        }
        this.setState({clicked:clickState});
    }

    render() {
        const {clicked} = this.state;
        const {elementID,name,image,idDeselected} = this.props;
        const imageToDisplay = image.length == 0 ? '' : image[1];

        let boxShadow='0px 0px 0px 0px white';

        if(clicked){
            boxShadow='inset 0px 0px 0px 5px black';
            
        }

        if(idDeselected === elementID && clicked){
            console.log('Same Element');
            boxShadow='0px 0px 0px 0px white';
            this.unClick();
        }

        const { artist } = this.props;

        return ( 
            <div onClick={this.addItem} key={elementID} style={{backgroundImage: 'url('+imageToDisplay.url+')', 'boxShadow':boxShadow}} className= "searchResult">
                <div className='filterOverText'>
                    <div className='tileTextWrap'>
                        <span className='tileName'>{name}</span>
                        {artist && <span className='tileArtist'>{artist}</span>}
                    </div>
                </div>
            </div>
        );
    }
}

SearchTile.propTypes = {
    elementID: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    artist: PropTypes.string,
    image:  PropTypes.array.isRequired,
    onAdd: PropTypes.func.isRequired,
    idDeselected: PropTypes.string.isRequired
}

export default SearchTile;

