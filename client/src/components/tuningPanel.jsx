import React from 'react';
import PropTypes from 'prop-types';
import '../css/site.css';

const TUNING_ATTRIBUTES = [
    {
        key: 'tempo',
        label: 'BPM (Tempo)',
        min: 40,
        max: 220,
        step: 1,
        defaultMin: 40,
        defaultMax: 220,
        description: 'Beats per minute',
        unit: ' BPM'
    },
    {
        key: 'energy',
        label: 'Energy',
        min: 0,
        max: 1,
        step: 0.01,
        defaultMin: 0,
        defaultMax: 1,
        description: 'Intensity and activity level',
        unit: ''
    },
    {
        key: 'danceability',
        label: 'Danceability',
        min: 0,
        max: 1,
        step: 0.01,
        defaultMin: 0,
        defaultMax: 1,
        description: 'How suitable for dancing',
        unit: ''
    },
    {
        key: 'valence',
        label: 'Mood (Valence)',
        min: 0,
        max: 1,
        step: 0.01,
        defaultMin: 0,
        defaultMax: 1,
        description: 'Musical positivity (0 = sad, 1 = happy)',
        unit: ''
    },
    {
        key: 'acousticness',
        label: 'Acousticness',
        min: 0,
        max: 1,
        step: 0.01,
        defaultMin: 0,
        defaultMax: 1,
        description: 'Likelihood of being acoustic',
        unit: ''
    },
    {
        key: 'instrumentalness',
        label: 'Instrumentalness',
        min: 0,
        max: 1,
        step: 0.01,
        defaultMin: 0,
        defaultMax: 1,
        description: 'Predicts whether a track has no vocals',
        unit: ''
    },
    {
        key: 'speechiness',
        label: 'Speechiness',
        min: 0,
        max: 1,
        step: 0.01,
        defaultMin: 0,
        defaultMax: 1,
        description: 'Presence of spoken words',
        unit: ''
    },
    {
        key: 'liveness',
        label: 'Liveness',
        min: 0,
        max: 1,
        step: 0.01,
        defaultMin: 0,
        defaultMax: 1,
        description: 'Probability of live recording',
        unit: ''
    },
    {
        key: 'popularity',
        label: 'Popularity',
        min: 0,
        max: 100,
        step: 1,
        defaultMin: 0,
        defaultMax: 100,
        description: 'How popular the track is (0–100)',
        unit: ''
    },
    {
        key: 'loudness',
        label: 'Loudness',
        min: -60,
        max: 0,
        step: 1,
        defaultMin: -60,
        defaultMax: 0,
        description: 'Overall loudness in decibels',
        unit: ' dB'
    }
];

const KEY_NAMES = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];

class TuningPanel extends React.Component {
    constructor(props) {
        super(props);
        // Initialize state with all attributes disabled (not active)
        const initialState = { trackCount: 30, targetKey: -1, targetMode: -1 };
        TUNING_ATTRIBUTES.forEach(attr => {
            initialState[attr.key + '_active'] = false;
            initialState[attr.key + '_mode'] = 'target'; // 'target', 'min', 'max', 'range'
            initialState[attr.key + '_target'] = Math.round((attr.max + attr.min) / 2 * 100) / 100;
            initialState[attr.key + '_min'] = attr.defaultMin;
            initialState[attr.key + '_max'] = attr.defaultMax;
        });
        this.state = initialState;
        this.handleChange = this.handleChange.bind(this);
        this.toggleAttribute = this.toggleAttribute.bind(this);
        this.buildParams = this.buildParams.bind(this);
        this.handleGenerate = this.handleGenerate.bind(this);
    }

    handleChange(key, value) {
        this.setState({ [key]: value });
    }

    toggleAttribute(attrKey) {
        this.setState(prev => ({ [attrKey + '_active']: !prev[attrKey + '_active'] }));
    }

    buildParams() {
        const params = {};
        params.limit = this.state.trackCount;

        TUNING_ATTRIBUTES.forEach(attr => {
            if (this.state[attr.key + '_active']) {
                const mode = this.state[attr.key + '_mode'];
                if (mode === 'target') {
                    params['target_' + attr.key] = this.state[attr.key + '_target'];
                } else if (mode === 'min') {
                    params['min_' + attr.key] = this.state[attr.key + '_min'];
                } else if (mode === 'max') {
                    params['max_' + attr.key] = this.state[attr.key + '_max'];
                } else if (mode === 'range') {
                    params['min_' + attr.key] = this.state[attr.key + '_min'];
                    params['max_' + attr.key] = this.state[attr.key + '_max'];
                }
            }
        });

        if (this.state.targetKey >= 0) {
            params['target_key'] = this.state.targetKey;
        }
        if (this.state.targetMode >= 0) {
            params['target_mode'] = this.state.targetMode;
        }

        return params;
    }

    handleGenerate() {
        const params = this.buildParams();
        this.props.onGenerate(params);
    }

    renderAttribute(attr) {
        const isActive = this.state[attr.key + '_active'];
        const mode = this.state[attr.key + '_mode'];
        const targetVal = this.state[attr.key + '_target'];
        const minVal = this.state[attr.key + '_min'];
        const maxVal = this.state[attr.key + '_max'];

        const displayValue = (val) => {
            if (attr.max <= 1) return val.toFixed(2);
            return Math.round(val);
        };

        return (
            <div key={attr.key} className={`tuningAttribute ${isActive ? 'tuningActive' : 'tuningInactive'}`}>
                <div className="tuningHeader" onClick={() => this.toggleAttribute(attr.key)}>
                    <span className="tuningToggle">{isActive ? '●' : '○'}</span>
                    <span className="tuningLabel">{attr.label}</span>
                    <span className="tuningDesc">{attr.description}</span>
                </div>
                {isActive && (
                    <div className="tuningControls">
                        <div className="tuningModeSelect">
                            {['target', 'min', 'max', 'range'].map(m => (
                                <button
                                    key={m}
                                    className={mode === m ? 'tuningModeBtn tuningModeBtnActive' : 'tuningModeBtn'}
                                    onClick={() => this.handleChange(attr.key + '_mode', m)}
                                >
                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                </button>
                            ))}
                        </div>
                        {(mode === 'target') && (
                            <div className="tuningSliderRow">
                                <input
                                    type="range"
                                    min={attr.min}
                                    max={attr.max}
                                    step={attr.step}
                                    value={targetVal}
                                    className="tuningSlider"
                                    onChange={(e) => this.handleChange(attr.key + '_target', parseFloat(e.target.value))}
                                />
                                <span className="tuningValue">{displayValue(targetVal)}{attr.unit}</span>
                            </div>
                        )}
                        {(mode === 'min') && (
                            <div className="tuningSliderRow">
                                <span className="tuningSliderLabel">Min:</span>
                                <input
                                    type="range"
                                    min={attr.min}
                                    max={attr.max}
                                    step={attr.step}
                                    value={minVal}
                                    className="tuningSlider"
                                    onChange={(e) => this.handleChange(attr.key + '_min', parseFloat(e.target.value))}
                                />
                                <span className="tuningValue">{displayValue(minVal)}{attr.unit}</span>
                            </div>
                        )}
                        {(mode === 'max') && (
                            <div className="tuningSliderRow">
                                <span className="tuningSliderLabel">Max:</span>
                                <input
                                    type="range"
                                    min={attr.min}
                                    max={attr.max}
                                    step={attr.step}
                                    value={maxVal}
                                    className="tuningSlider"
                                    onChange={(e) => this.handleChange(attr.key + '_max', parseFloat(e.target.value))}
                                />
                                <span className="tuningValue">{displayValue(maxVal)}{attr.unit}</span>
                            </div>
                        )}
                        {(mode === 'range') && (
                            <React.Fragment>
                                <div className="tuningSliderRow">
                                    <span className="tuningSliderLabel">Min:</span>
                                    <input
                                        type="range"
                                        min={attr.min}
                                        max={attr.max}
                                        step={attr.step}
                                        value={minVal}
                                        className="tuningSlider"
                                        onChange={(e) => this.handleChange(attr.key + '_min', parseFloat(e.target.value))}
                                    />
                                    <span className="tuningValue">{displayValue(minVal)}{attr.unit}</span>
                                </div>
                                <div className="tuningSliderRow">
                                    <span className="tuningSliderLabel">Max:</span>
                                    <input
                                        type="range"
                                        min={attr.min}
                                        max={attr.max}
                                        step={attr.step}
                                        value={maxVal}
                                        className="tuningSlider"
                                        onChange={(e) => this.handleChange(attr.key + '_max', parseFloat(e.target.value))}
                                    />
                                    <span className="tuningValue">{displayValue(maxVal)}{attr.unit}</span>
                                </div>
                            </React.Fragment>
                        )}
                    </div>
                )}
            </div>
        );
    }

    render() {
        const { trackCount, targetKey, targetMode } = this.state;
        const activeCount = TUNING_ATTRIBUTES.filter(a => this.state[a.key + '_active']).length;

        return (
            <div className="tuningPanel">
                <h3 className="tuningTitle">Fine-Tune Your Playlist</h3>
                <p className="tuningSubtitle">
                    Toggle attributes to shape your recommendations. 
                    {activeCount > 0 ? ` ${activeCount} filter${activeCount > 1 ? 's' : ''} active.` : ' No filters active — you\'ll get general recommendations.'}
                </p>

                <div className="tuningTrackCount">
                    <label>Number of tracks: </label>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={trackCount}
                        onChange={(e) => this.handleChange('trackCount', parseInt(e.target.value) || 1)}
                        className="trackCountInput"
                    />
                </div>

                <div className="tuningKeyMode">
                    <div className="tuningKeySelect">
                        <label>Key: </label>
                        <select
                            value={targetKey}
                            onChange={(e) => this.handleChange('targetKey', parseInt(e.target.value))}
                            className="tuningSelect"
                        >
                            <option value={-1}>Any</option>
                            {KEY_NAMES.map((name, i) => (
                                <option key={i} value={i}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="tuningModeSelectMusical">
                        <label>Mode: </label>
                        <select
                            value={targetMode}
                            onChange={(e) => this.handleChange('targetMode', parseInt(e.target.value))}
                            className="tuningSelect"
                        >
                            <option value={-1}>Any</option>
                            <option value={0}>Minor</option>
                            <option value={1}>Major</option>
                        </select>
                    </div>
                </div>

                <div className="tuningAttributesList">
                    {TUNING_ATTRIBUTES.map(attr => this.renderAttribute(attr))}
                </div>

                <button className="generateButton" onClick={this.handleGenerate}>
                    Generate Recommendations
                </button>
            </div>
        );
    }
}

TuningPanel.propTypes = {
    onGenerate: PropTypes.func.isRequired
};

export default TuningPanel;
