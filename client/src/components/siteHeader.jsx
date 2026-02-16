import React from 'react';
import PropTypes from 'prop-types';
import backendRequest from '../api/backendRequest';
import '../css/site.css';

class SiteHeader extends React.Component {
    constructor(props) {
        super(props);
        this.handleLogin = this.handleLogin.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
    }

    componentDidMount() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('auth_success') === 'true') {
            window.history.replaceState({}, '', '/');
            this.props.onAuthCheck();
        }
    }

    handleLogin() {
        if (this.props.onBeforeLogin) this.props.onBeforeLogin();
        backendRequest.getAuthUrl((data) => {
            if (data.url) window.location.href = data.url;
        });
    }

    handleLogout() {
        backendRequest.logout(() => this.props.onLogout());
    }

    render() {
        const { authenticated, user } = this.props;
        const avatar = user && user.images && user.images.length > 0 ? user.images[0].url : null;

        return (
            <header className="appHeader">
                <div className="appLogo">
                    <svg className="logoWave" viewBox="0 0 40 24" width="32" height="20">
                        <path d="M2 12 Q8 0, 14 12 Q20 24, 26 12 Q32 0, 38 12" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    <span className="logoText">TeraHz</span>
                </div>
                <div className="headerAuth">
                    {authenticated && user ? (
                        <div className="headerUser">
                            {avatar && <img src={avatar} alt="" className="headerAvatar" />}
                            <span className="headerUserName">{user.display_name}</span>
                            <button className="headerBtn headerLogout" onClick={this.handleLogout}>Log out</button>
                        </div>
                    ) : (
                        <button className="headerBtn headerLoginSubtle" onClick={this.handleLogin}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{marginRight: '6px'}}>
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                            Connect Spotify
                        </button>
                    )}
                </div>
            </header>
        );
    }
}

SiteHeader.propTypes = {
    authenticated: PropTypes.bool.isRequired,
    user: PropTypes.object,
    onAuthCheck: PropTypes.func.isRequired,
    onLogout: PropTypes.func.isRequired,
    onBeforeLogin: PropTypes.func
};

export default SiteHeader;
