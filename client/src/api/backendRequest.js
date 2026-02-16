export default class baseService {

    static get(url, callback) {
        fetch('/' + url)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        try { return JSON.parse(text); }
                        catch(e) { return { error: { message: text || 'Request failed' } }; }
                    });
                }
                return response.text().then(text => {
                    try { return JSON.parse(text); }
                    catch(e) { return { error: { message: 'Invalid response from server' } }; }
                });
            })
            .then(data => callback(data))
            .catch(error => {
                console.error(error);
                callback({ error: { message: error.message || 'Network error' } });
            });
    }

    static post(url, body, callback) {
        fetch('/' + url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        try { return JSON.parse(text); }
                        catch(e) { return { error: { message: text || 'Request failed' } }; }
                    });
                }
                return response.text().then(text => {
                    try { return JSON.parse(text); }
                    catch(e) { return { error: { message: 'Invalid response from server' } }; }
                });
            })
            .then(data => callback(data))
            .catch(error => {
                console.error(error);
                callback({ error: { message: error.message || 'Network error' } });
            });
    }

    static getAuthUrl(callback) {
        fetch('/auth/login')
            .then(response => response.json())
            .then(data => callback(data))
            .catch(error => console.error(error));
    }

    static getAuthStatus(callback) {
        fetch('/auth/status')
            .then(response => response.json())
            .then(data => callback(data))
            .catch(error => console.error(error));
    }

    static logout(callback) {
        fetch('/auth/logout')
            .then(response => response.json())
            .then(data => callback(data))
            .catch(error => console.error(error));
    }
}