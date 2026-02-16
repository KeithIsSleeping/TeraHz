const config=require("../config.js");

let accessToken = 'INITIALTOKEN';
const https = require('https');

function getAccessToken() {
    const options = {
      hostname: 'accounts.spotify.com',
      path: '/api/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
  
    const postData = 'grant_type=client_credentials&client_id=' + config.clientId + '&client_secret=' + config.clientSecret;
  
    const req = https.request(options, res => {
      let data = '';
  
      res.on('data', chunk => {
        data += chunk;
      });
  
      res.on('end', () => {
        const result = JSON.parse(data);
        accessToken = result.access_token;
        const expiresIn = result.expires_in;
        console.log('Access token:', accessToken);
        console.log('Expires in:', expiresIn);

      });
    });
  
    req.on('error', error => {
      console.error(error);
    });
  
    req.write(postData);
    req.end();
}

function startAccessToken(){
    getAccessToken();
    setInterval(getAccessToken, 1000 * 60  * 30); // Refresh token every 30 minutes, well before the 1 hour expiration timer
}

function retrieveAccessToken(){
    return accessToken;

}

module.exports = {
    getAccessToken:retrieveAccessToken,
    start : startAccessToken
}
