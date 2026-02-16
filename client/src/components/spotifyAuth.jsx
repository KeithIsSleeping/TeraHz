import React from 'react';
import PropTypes from 'prop-types';
import backendRequest from '../api/backendRequest';
import '../css/site.css';

class SpotifyAuth extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.handleLogin = this.handleLogin.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
    }

    componentDidMount() {
        // Check for auth callback
        const params = new URLSearchParams(window.location.search);
        if (params.get('auth_success') === 'true') {
            window.history.replaceState({}, '', '/');
            this.props.onAuthCheck();
        }
    }

    handleLogin() {
        backendRequest.getAuthUrl((data) => {
            if (data.url) {
                window.location.href = data.url;
            }
        });
    }

    handleLogout() {
        backendRequest.logout(() => {
            this.props.onLogout();
        });
    }

    render() {
        const { user, authenticated } = this.props;

        if (authenticated && user) {
            const avatar = user.images && user.images.length > 0 ? user.images[0].url : null;
            return (
                <div className="authContainer authLoggedIn">
                    {avatar && <img src={avatar} alt="avatar" className="userAvatar" />}
                    <span className="userName">{user.display_name}</span>
                    <button className="authButton logoutButton" onClick={this.handleLogout}>Logout</button>
                </div>
            );
        }

        return (
            <div className="authContainer">
                <button className="authButton loginButton" onClick={this.handleLogin}>
                    <span className="spotifyIcon">♫</span> Connect Spotify
                </button>
            </div>
        );
    }
}

SpotifyAuth.propTypes = {
    authenticated: PropTypes.bool.isRequired,
    user: PropTypes.object,
    onAuthCheck: PropTypes.func.isRequired,
    onLogout: PropTypes.func.isRequired
};

export default SpotifyAuth;
