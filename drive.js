var googleAuthToken;

chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
    googleAuthToken = token;
});
