// to create objects for holding course information
function course(courseJSONobj, courseDiv) {
    this.courseJSON = courseJSONobj;
    this.div = courseDiv;
    this.filesAndFoldersDiv;
    this.folderRootId;
    this.foldersMap;
    this.filesList;
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

        // create file name div
        for (i = 0; i < JSONresponseArray.length; i++) {
            var nodeDiv = document.createElement("div");

            // if file is not accessible for the user
            if (JSONresponseArray[i].hidden == true
                || JSONresponseArray[i].hidden_for_user == true
                || JSONresponseArray[i].locked == true
                || JSONresponseArray[i].locked_for_user == true) {
                // display lock icon for inaccessible file
                var lockOutlineImg = document.createElement("img");
                lockOutlineImg.src = "assets/material/lock_outline/ic_lock_outline_black_24dp_1x.png";
                nodeDiv.appendChild(lockOutlineImg);

                // display file name
                var fileNameP = document.createElement("p");
                fileNameP.className = "fileNameP";
                var nodeText = document.createTextNode(JSONresponseArray[i].display_name);
                fileNameP.appendChild(nodeText);
                nodeDiv.appendChild(fileNameP);
            } else { // file is accessible to user
                // display sync button for one click upload to Google Drive
                var syncImg = document.createElement("img");
                syncImg.src = "assets/material/sync/ic_sync_black_24dp_1x.png";
                syncImg.onclick = makeUploadFile(JSONresponseArray[i], course);
                nodeDiv.appendChild(syncImg);

                // display download icon
                var downloadA = document.createElement("a");
                var downloadImg = document.createElement("img");
                downloadImg.src = "assets/material/file_download/ic_file_download_black_24dp_1x.png";
                downloadA.setAttribute("href", JSONresponseArray[i].url);
                downloadA.appendChild(downloadImg);
                nodeDiv.appendChild(downloadA);

                // display name of file with preview link
                var nodeA = document.createElement("a");
                nodeA.setAttribute("href", "javascript:void(0);");
                nodeA.onclick = makePreviewLink(JSONresponseArray[i].id);
                nodeA.innerHTML = JSONresponseArray[i].display_name;
                nodeDiv.appendChild(nodeA);
            }

            // if file is located in root rolder, add file directly to course filesAndFoldersDiv
            if (JSONresponseArray[i].folder_id == course.folderRootId) {
                course.filesAndFoldersDiv.appendChild(nodeDiv);
            } else { // else add files to respective folder div
                var folderDiv = course.foldersMap.get(JSONresponseArray[i].folder_id).div;
                folderDiv.appendChild(nodeDiv);
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

function getFoldersList(page, course) {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split("while(1);", 2)[1]);

        // create foldersMap if this is the first time getting folders for course
        if (course.foldersMap === undefined) {
            course.foldersMap = new Map();
        }

        // add folder names to folder map in course object
        for (i = 0; i < JSONresponseArray.length; i++) {
            // if current folder does not have a parent, set it as the root folder
            if (JSONresponseArray[i].parent_folder_id == null) {
                course.folderRootId = JSONresponseArray[i].id;

                // create div for course files and folders
                course.filesAndFoldersDiv = document.createElement("div");

                // add folder to map with id as key and folder object as value
                var folderObj = new folder(JSONresponseArray[i], course.filesAndFoldersDiv);
                course.foldersMap.set(JSONresponseArray[i].id, folderObj);
            } else { // else create div for folder and add to map
                var nodeDiv = document.createElement("div");
                var folderImg = document.createElement("img");
                folderImg.src = "assets/material/folder_open/ic_folder_open_black_24dp_1x.png";
                nodeDiv.appendChild(folderImg);
                var nodeP = document.createElement("p");
                nodeP.className = "folderNameP";
                var nodeText = document.createTextNode(JSONresponseArray[i].name);
                nodeP.appendChild(nodeText);
                nodeDiv.appendChild(nodeP);

                // add folder to map with id as key and folder object as value
                var folderObj = new folder(JSONresponseArray[i], nodeDiv);
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

function getCoursesList(page) {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split("while(1);", 2)[1]);
        // sort courses by term
        JSONresponseArray.sort(function(a, b){return b.enrollment_term_id - a.enrollment_term_id});
        // get div for course list
        var coursesDiv = document.getElementById("courses");

        // add course names to page
        for (i = 0; i < JSONresponseArray.length; i++) {
            if (JSONresponseArray[i].hasOwnProperty("name")) {
                var courseDiv = document.createElement("div");
                var courseNameHeader = document.createElement("h1");
                var courseNameP = document.createElement("p");
                var courseName = document.createTextNode(JSONresponseArray[i].name);
                courseNameP.appendChild(courseName);
                courseNameHeader.appendChild(courseNameP);
                courseDiv.appendChild(courseNameHeader);
                coursesDiv.appendChild(courseDiv);

                var courseObj = new course(JSONresponseArray[i], courseDiv);
                // get list of folders for course
                getFoldersList(1, courseObj);
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

function getFile(JSONresponse) {
    var xhr = new XMLHttpRequest();
    // call initiateUpload from drive.js when file is downloaded
    xhr.addEventListener("load", function() {
        getDriveIdByCanvasFolderId(JSONresponse, this.getResponseHeader("content-type"),
            this.response);
    });
    xhr.open("GET", JSONresponse.url);
    // get binary file contents
    xhr.responseType = "blob";
    xhr.send();
}
