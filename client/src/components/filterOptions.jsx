import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';

class FilterOptions extends React.Component {
constructor(props) {
    super(props);
    this.state = {
    };
}

render() {
    const {name, setActive, isActive} = this.props;
    return (
        <div className={isActive ? 'filterSeedItem activeSeedNav' : 'filterSeedItem inactiveSeedNav'} onClick={setActive}>{name}</div>
    );
}
}

FilterOptions.propTypes = {
    name: PropTypes.string.isRequired,
    isActive: PropTypes.bool.isRequired,
    setActive: PropTypes.func.isRequired,
}

export default FilterOptions;

