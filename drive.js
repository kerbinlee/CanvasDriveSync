// authntication token for Google API
var googleAuthToken;

// upload fileBlob to uploadLocationURL
function uploadFile(uploadLocationURL, fileBlob) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadLocationURL);
    xhr.send(fileBlob);
}

// get URL from Google Drive API for file upload
function initiateUpload(fileName, fileType, fileBlob) {
    // get authentication token for Google API and then initiate upload
    chrome.identity.getAuthToken({"interactive": true }, function(token) {
        googleAuthToken = token;

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable");
        // upload fileBolb once upload URL is returned
        xhr.addEventListener("load", function() {
            uploadFile(this.getResponseHeader("location"), fileBlob);
        });
        xhr.setRequestHeader("Authorization", "Bearer " + googleAuthToken);
        xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
        // send request with file name as body
        xhr.send(JSON.stringify({"name": fileName}));
    });
}
