import React from 'react';
import '../css/site.css';
import SiteHeader from './siteHeader';
import SiteContent from './siteContent';
import backendRequest from '../api/backendRequest';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            authenticated: false,
            user: null
        };
        this.contentRef = React.createRef();
        this.checkAuth = this.checkAuth.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
        this.handleBeforeLogin = this.handleBeforeLogin.bind(this);
        this.handleLoginFromContent = this.handleLoginFromContent.bind(this);
    }

    handleBeforeLogin() {
        if (this.contentRef.current && this.contentRef.current.saveState) {
            this.contentRef.current.saveState();
        }
    }

    handleLoginFromContent() {
        this.handleBeforeLogin();
        backendRequest.getAuthUrl((data) => {
            if (data.url) window.location.href = data.url;
        });
    }

    componentDidMount() {
        this.checkAuth();
    }

    checkAuth() {
        backendRequest.getAuthStatus((data) => {
            if (data.authenticated) {
                this.setState({ authenticated: true, user: data.user });
            }
        });
    }

    handleLogout() {
        this.setState({ authenticated: false, user: null });
    }

    render() {
        const { authenticated, user } = this.state;
        return (
            <div className="appShell">
                <SiteHeader
                    authenticated={authenticated}
                    user={user}
                    onAuthCheck={this.checkAuth}
                    onLogout={this.handleLogout}
                    onBeforeLogin={this.handleBeforeLogin}
                />
                <SiteContent
                    ref={this.contentRef}
                    authenticated={authenticated}
                    user={user}
                    onLogin={this.handleLoginFromContent}
                />
            </div>
        );
    }
}

export default App;
