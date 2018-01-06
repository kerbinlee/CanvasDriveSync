// authntication token for Google API
var googleAuthToken;

function getAuthToken() {
    chrome.identity.getAuthToken({ "interactive": true }, function(token) {
        googleAuthToken = token;
    });
}

// add functionality to Google sign in button
window.onload = function() {
    document.getElementById("googleSignInDiv").addEventListener("click", function() {
        getAuthToken();
    })
}

// upload fileBlob to uploadLocationURL
function uploadFile(uploadLocationURL, fileBlob) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadLocationURL);
    xhr.send(fileBlob);
}

// get Google Drive file id of folder where file is to be uploaded
function getDriveIdByCanvasFolderId(JSONresponse, fileType, fileBlob) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://www.googleapis.com/drive/v3/files?q=appProperties+has+%7B+key%3D'canvasId'+and+value%3D'"
        + JSONresponse.folder_id + "'+%7D&fields=files%2Fid");
    xhr.addEventListener("load", function() {
        var folderId = (JSON.parse(xhr.responseText).files)[0].id;
        initiateUploadFile(JSONresponse, fileType, fileBlob, folderId);
    });
    xhr.setRequestHeader("Authorization", "Bearer " + googleAuthToken);
    xhr.send();
}

// get URL from Google Drive API for file upload
// parentFolderId is Google Drive file id of folder where file is to be uploaded
function initiateUploadFile(JSONresponse, fileType, fileBlob, parentFolderId) {
    var appProperties = {
        "canvasId": JSONresponse.id,
        "folderId": JSONresponse.folder_id,
        "createdAt": JSONresponse.created_at,
        "updatedAt": JSONresponse.updated_at,
        "modifiedAt": JSONresponse.modified_at,
        "syncedAt": (new Date()).toISOString()
    }

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable");
    // upload fileBlob once upload URL is returned
    xhr.addEventListener("load", function() {
        uploadFile(this.getResponseHeader("location"), fileBlob);
    });
    xhr.setRequestHeader("Authorization", "Bearer " + googleAuthToken);
    xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
    // send request with file name as body
    xhr.send(JSON.stringify({"name": JSONresponse.display_name, "appProperties": appProperties,
        "parents": [parentFolderId]}));
}

// create needed folders on Google Drive
// parentFolderId is referring to Google Drive file id
function createFolders(newFolders, course, JSONresponse, parentFolderId) {
    // if new folders still need to be created
    if (newFolders.length > 0) {
        var folderId = newFolders.pop();
        var folderJSONresponse = course.foldersMap.get(folderId).folderJSONobject;
        var appProperties = {
            "canvasId": folderJSONresponse.id,
            "folderId": folderJSONresponse.parent_folder_id,
            "createdAt": folderJSONresponse.created_at,
            "updatedAt": folderJSONresponse.updated_at,
            "syncedAt": (new Date()).toISOString()
        }

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://www.googleapis.com/drive/v3/files?uploadType=multipart");
        xhr.addEventListener("load", function() {
            var newFolderId = JSON.parse(xhr.responseText).id;
            createFolders(newFolders, course, JSONresponse, newFolderId);
        });
        xhr.setRequestHeader("Authorization", "Bearer " + googleAuthToken);
        xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
        // send request with folder name as body
        xhr.send(JSON.stringify({"name": folderJSONresponse.name, "mimeType": "application/vnd.google-apps.folder",
            "parents": [parentFolderId], "appProperties": appProperties}));
    } else { // else upload the file
        getFile(JSONresponse);
    }
}

function checkForNeededFolders(folderId, newFolders, JSONresponse, course) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://www.googleapis.com/drive/v3/files?q=appProperties+has+%7B+key%3D'canvasId'+and+value%3D'"
        + folderId + "'+%7D&fields=files%2Fid");
    xhr.addEventListener("load", function() {
        var filesJSONarray = JSON.parse(xhr.responseText).files;
        // if folder is not found
        if (filesJSONarray.length == 0) {
            // add to list of folders to create
            newFolders.push(folderId);
            // check if parent folder exists
            var parentFolderId = course.foldersMap.get(folderId).folderJSONobject.parent_folder_id;
            // if this is not the root folder
            if (parentFolderId != null) {
                // continue checking for more needed folders
                checkForNeededFolders(parentFolderId, newFolders, JSONresponse, course);
            } else {
                createFolders(newFolders, course, JSONresponse, "root");
            }
        } else { // folder found, create new subfolders if needed
            createFolders(newFolders, course, JSONresponse, filesJSONarray[0].id);
        }
    });
    xhr.setRequestHeader("Authorization", "Bearer " + googleAuthToken);
    xhr.send();
}
