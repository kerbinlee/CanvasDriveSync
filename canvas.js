// map of all courses
var coursesMap;

// to create objects for holding course information
function course(courseJSONobj, courseDiv) {
    this.courseJSON = courseJSONobj;
    this.div = courseDiv;
    this.filesAndFoldersDiv;
    this.folderRootId;
    this.foldersMap = new Map();
    this.filesMap = new Map();
    this.driveFilesMap;
}

// to create objects for holding folder JSON object and its corresponding div element
function folder(folderJSONobject, div) {
    this.folderJSONobject = folderJSONobject;
    this.div = div;
}

function displayFolders(course) {
    course.foldersMap.forEach(function(folder, id) {
        // if folder is not root, append folder div to parent folder's div
        if (folder.folderJSONobject.parent_folder_id != null) {
            var parentFolderDiv = course.foldersMap.get(folder.folderJSONobject.parent_folder_id).div;
            parentFolderDiv.appendChild(folder.div);
        }
    });
}

// closure for one click upload
function makeUploadFile(JSONresponse, course) {
    return function() {
        var newFolders = [];
        // set up directory structure in Google Drive if it does not already exist
        // also downloads file from Canvas and uploads to Google Drive
        checkForNeededFolders(JSONresponse.folder_id, newFolders, JSONresponse, course);
    }
}

// closure to add link to preview document or download it if preview is not possible
function makePreviewLink(fileId) {
    return function() {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("load", function() {
            var JSONresponse = JSON.parse(this.responseText.split("while(1);", 2)[1]);;
            console.log(JSONresponse.public_url);
            chrome.tabs.create({ url: JSONresponse.public_url });
        });
        xhr.open("GET", "https://canvas.ucdavis.edu/api/v1/files/" + fileId
            + "/public_url");
        xhr.send();
    }
}

function getFilesList(page, course) {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split("while(1);", 2)[1]);

        // create file name div for each file
        var i;
        for (i = 0; i < JSONresponseArray.length; i++) {
            // add Canvas file metadata to filesMap for course with file ID as key and metadata as value
            course.filesMap.set(JSONresponseArray[i].id.toString(), JSONresponseArray[i]);

            // div to contain everything for a file
            var fileDiv = document.createElement("div");
            fileDiv.className = "fileDiv";
            fileDiv.id = "fileDiv" + JSONresponseArray[i].id;
            fileDiv.dataset.id = JSONresponseArray[i].id; // store file ID in div

            // div within fileDiv containing file links
            var linksDiv = document.createElement("div");
            fileDiv.appendChild(linksDiv);
            // div within fileDiv containing messages for file
            var messageDiv = document.createElement("div");
            fileDiv.appendChild(messageDiv);

            // if file is not accessible for the user
            if (JSONresponseArray[i].hidden == true
                || JSONresponseArray[i].hidden_for_user == true
                || JSONresponseArray[i].locked == true
                || JSONresponseArray[i].locked_for_user == true) {
                // display lock icon for inaccessible file
                var lockOutlineImg = document.createElement("img");
                lockOutlineImg.src = "assets/material/lock_outline/ic_lock_outline_black_24dp_1x.png";
                linksDiv.appendChild(lockOutlineImg);

                // display file name
                var fileNameP = document.createElement("p");
                fileNameP.className = "fileNameP";
                var nodeText = document.createTextNode(JSONresponseArray[i].display_name);
                fileNameP.appendChild(nodeText);
                linksDiv.appendChild(fileNameP);
            } else { // file is accessible to user
                // add sync div for sync status icon
                var syncDiv = document.createElement("div");
                syncDiv.className = "syncDiv";
                linksDiv.appendChild(syncDiv);

                // display download icon
                var downloadA = document.createElement("a");
                var downloadImg = document.createElement("img");
                downloadImg.src = "assets/material/file_download/ic_file_download_black_24dp_1x.png";
                downloadA.setAttribute("href", JSONresponseArray[i].url);
                downloadA.appendChild(downloadImg);
                linksDiv.appendChild(downloadA);

                // display name of file with preview link
                var nodeA = document.createElement("a");
                nodeA.setAttribute("href", "javascript:void(0);");
                nodeA.onclick = makePreviewLink(JSONresponseArray[i].id);
                nodeA.innerHTML = JSONresponseArray[i].display_name;
                linksDiv.appendChild(nodeA);
            }

            // if file is located in root rolder, add file directly to course filesAndFoldersDiv
            if (JSONresponseArray[i].folder_id == course.folderRootId) {
                course.filesAndFoldersDiv.appendChild(fileDiv);
            } else { // else add files to respective folder div
                var folderDiv = course.foldersMap.get(JSONresponseArray[i].folder_id).div;
                folderDiv.appendChild(fileDiv);
            }
        }

        // if results were returned, get next page of files
        if (JSONresponseArray.length > 0) {
            getFilesList(page + 1, course);
        } else { // else display files and folders div
            course.div.appendChild(course.filesAndFoldersDiv);
        }
    }

	var request = new XMLHttpRequest();
    // call requestListener when request is loaded
	request.addEventListener("load", requestListener);
	request.open("GET", "https://canvas.ucdavis.edu/api/v1/courses/" + course.courseJSON.id
        + "/files?page=" + page + "&per_page=100");
    request.send();
}

function makeShowSyncStatus(course) {
    return function() {
        getDriveFilesListByCourse(course);
    }
}

function getFoldersList(page, course) {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split("while(1);", 2)[1]);

        // add folder names to folder map in course object
        for (i = 0; i < JSONresponseArray.length; i++) {
            // if current folder does not have a parent, set it as the root folder
            if (JSONresponseArray[i].parent_folder_id == null) {
                course.folderRootId = JSONresponseArray[i].id;

                // create div for course files and folders
                course.filesAndFoldersDiv = document.createElement("div");

                // button to show sync status of files
                var showSyncStatusButton = document.createElement("button");
                showSyncStatusButton.innerText = "Show Sync Status";
                showSyncStatusButton.onclick = makeShowSyncStatus(course);
                course.filesAndFoldersDiv.appendChild(showSyncStatusButton);

                // add folder to map with id as key and folder object as value
                var folderObj = new folder(JSONresponseArray[i], course.filesAndFoldersDiv);
                course.foldersMap.set(JSONresponseArray[i].id, folderObj);
            } else { // else create div for folder and add to map
                var folderDiv = document.createElement("div");
                folderDiv.className = "folderDiv";
                var folderImg = document.createElement("img");
                folderImg.src = "assets/material/folder_open/ic_folder_open_black_24dp_1x.png";
                folderDiv.appendChild(folderImg);
                var nodeP = document.createElement("p");
                nodeP.className = "folderNameP";
                var nodeText = document.createTextNode(JSONresponseArray[i].name);
                nodeP.appendChild(nodeText);
                folderDiv.appendChild(nodeP);

                // add folder to map with id as key and folder object as value
                var folderObj = new folder(JSONresponseArray[i], folderDiv);
                course.foldersMap.set(JSONresponseArray[i].id, folderObj);
            }
        }

        // if results were returned, get next page of folders
        if (JSONresponseArray.length > 0) {
            getFoldersList(page + 1, course);
        } else { // else display the folders and then get files
            displayFolders(course);
            getFilesList(1, course);
        }
    }

	var request = new XMLHttpRequest();
    // call requestListener when request is loaded
	request.addEventListener("load", requestListener);
	request.open("GET", "https://canvas.ucdavis.edu/api/v1/courses/" + course.courseJSON.id
        + "/folders?page=" + page + "&per_page=100");
    request.send();
}

function makeGetFoldersAndFiles(courseObj) {
    return function() {
        // get list of folders for course
        getFoldersList(1, courseObj);
    }
}

function getCoursesList(page) {
    // function that is called when data is returned
    function requestListener() {
        // get div for course list
        var coursesDiv = document.getElementById("courses");

        // if Canvas says unauthorized
        if (this.status == 401) {
            var errorP = document.createElement("p");
            var errorText = document.createTextNode("Canvas says you are unauthorized. "
                + "Try signing in at ");
            errorP.appendChild(errorText);

            var canvasLink = document.createElement("a");
            canvasLink.href = "https://canvas.ucdavis.edu";
            var canvasLinkText = document.createTextNode("canvas.ucdavis.edu");
            canvasLink.appendChild(canvasLinkText);
            errorP.appendChild(canvasLink);

            errorText = document.createTextNode(" and then relaunch Canvas-Google Drive Sync");
            errorP.appendChild(errorText);
            coursesDiv.appendChild(errorP);

            return;
        } else if (this.status != 200) { // else if not ok status
            var errorP = document.createElement("p");
            var errorText = document.createTextNode("Canvas returned unknown error.");
            errorP.appendChild(errorText);
            coursesDiv.appendChild(errorP);

            return;
        }

        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split("while(1);", 2)[1]);
        // sort courses by term
        JSONresponseArray.sort(function(a, b){return b.enrollment_term_id - a.enrollment_term_id});

        // add course names to page
        for (i = 0; i < JSONresponseArray.length; i++) {
            if (JSONresponseArray[i].hasOwnProperty("name")) {
                var courseDiv = document.createElement("div");
                courseDiv.className = "courseDiv";
                courseDiv.id = "courseDiv" + JSONresponseArray[i].id;
                var courseNameDiv = document.createElement("div");
                var courseNameHeader = document.createElement("h1");
                var courseNameP = document.createElement("p");
                var courseName = document.createTextNode(JSONresponseArray[i].name);
                courseNameP.appendChild(courseName);
                courseNameHeader.appendChild(courseNameP);
                courseNameDiv.appendChild(courseNameHeader);
                courseDiv.appendChild(courseNameDiv);
                coursesDiv.appendChild(courseDiv);

                var courseObj = new course(JSONresponseArray[i], courseDiv);
                // if coursesMap does not exist yet, create it
                if (coursesMap === undefined) {
                    coursesMap = new Map();
                }
                // add course to coursesMap with course ID as key and course object as value
                coursesMap.set(JSONresponseArray[i].id, courseObj);

                // make course name clickable to load files list from canvas
                courseNameDiv.onclick = makeGetFoldersAndFiles(courseObj);
            }
        }

        // if results were returned, get next page of courses
        if (JSONresponseArray.length > 0) {
            getCoursesList(page + 1);
        }
    }

	var request = new XMLHttpRequest();
    // call requestListener when request is loaded
	request.addEventListener("load", requestListener);
	request.open("GET", "https://canvas.ucdavis.edu/api/v1/courses/?page=" + page
        + "&per_page=100");
    request.send();
}

getCoursesList(1);

function getFile(JSONresponse, courseId) {
    var xhr = new XMLHttpRequest();
    // call initiateUpload from drive.js when file is downloaded
    xhr.addEventListener("load", function() {
        getDriveIdByCanvasFolderId(JSONresponse, courseId, this.getResponseHeader("content-type"),
            this.response);
    });
    xhr.open("GET", JSONresponse.url);
    // get binary file contents
    xhr.responseType = "blob";
    xhr.send();
}

function displaySyncIcon(JSONresponse, course, syncDiv) {
    // display sync icon
    var syncImg = document.createElement("img");
    syncImg.src = "assets/material/sync/ic_sync_black_24dp_1x.png";
    syncImg.onclick = makeUploadFile(JSONresponse, course);
    syncDiv.appendChild(syncImg);
}

function displaySyncStatus(course) {
    // get all files displayed for course
    var courseFilesDivArray = course.div.getElementsByClassName("fileDiv");

    // for each displayed file
    var i;
    for (i = 0; i < courseFilesDivArray.length; i++) {
        // get file ID stored in file div
        var fileId = courseFilesDivArray[i].dataset.id;

        // get div containing sync status icon for file
        var syncDiv = courseFilesDivArray[i].getElementsByClassName("syncDiv")[0];
        // remove everything from syncDiv
        while (syncDiv.firstChild) {
            syncDiv.removeChild(syncDiv.firstChild);
        }

        // get file properties from Google Drive if it exists for course
        var driveFileProperties;
        if (course.driveFilesMap != undefined) {
            driveFileProperties = course.driveFilesMap.get(fileId);
        }

        // get Canvas properties for file
        var JSONresponse = course.filesMap.get(fileId);

        // if file is not found on Google Drive
        if (driveFileProperties === undefined) {
            displaySyncIcon(JSONresponse, course, syncDiv);
        } else {
            // get Google Drive properties for file
            var appProperties = driveFileProperties.appProperties;
            // if Canvas and Google Drive file properties do not match
            if (appProperties.folderId != JSONresponse.folder_id
                || appProperties.createdAt != JSONresponse.created_at
                || appProperties.updatedAt != JSONresponse.updated_at
                || appProperties.modifiedAt != JSONresponse.modified_at) {

                displaySyncIcon(JSONresponse, course, syncDiv);
            } else {
                // display synced icon
                var syncImg = document.createElement("img");
                syncImg.src = "assets/material/sync_disabled/ic_sync_disabled_black_24dp_1x.png";
                syncDiv.appendChild(syncImg);
            }
        }
    }
}
