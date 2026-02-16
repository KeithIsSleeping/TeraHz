import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';

class SeedItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
        this.onDeleteItem = this.onDeleteItem.bind(this);
    }

    onDeleteItem(){
        let songObj = {id: this.props.id, name: this.props.name};
        this.props.onDelete(songObj);
    }

    render() {
        const {} = this.state;
        const {} = this.props;

        return (
            <React.Fragment>
                <div onClick={this.onDeleteItem} className='seedItemWrapper'>
                    <span className='seedText'>{this.props.name}</span>
                    <div className='deleteSeedButton'>
                        <div className='x' ></div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

SeedItem.propTypes = {
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    onDelete: PropTypes.func.isRequired
}
export default SeedItem;

