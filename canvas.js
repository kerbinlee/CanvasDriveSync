// to create objects for holding course information
function course(courseJSONobj, courseDiv) {
    this.courseJSON = courseJSONobj;
    this.div = courseDiv;
    this.folderRootId;
    this.foldersMap;
    this.filesList;
}

// to create ojects for holding folder JSON object and its corresponding div element
function folder(folderJSONbject, div) {
    this.folderJSONbject = folderJSONbject;
    this.div = div;
}

function getFilesList(page, course) {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split('while(1);',2)[1]);

        // add file names to respective folder div
        for (i = 0; i < JSONresponseArray.length; i++) {
            var nodeDiv = document.createElement('div');
            var nodeP = document.createElement('p');
            var nodeText = document.createTextNode(JSONresponseArray[i].display_name);
            nodeP.appendChild(nodeText);
            nodeDiv.appendChild(nodeP);
            var folderDiv = course.foldersMap.get(JSONresponseArray[i].folder_id).div;
            folderDiv.appendChild(nodeDiv);
        }

        // if results were returned, get next page of files
        if (JSONresponseArray.length > 0) {
            getFilesList(page + 1, course);
        }
    }

	var request = new XMLHttpRequest();
    // call requestListener when request is loaded
	request.addEventListener('load', requestListener);
	request.open('GET', 'https://canvas.ucdavis.edu/api/v1/courses/' + course.courseJSON.id
        + '/files?page=' + page + '&per_page=100');
    request.send();
}

function getFoldersList(page, course) {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split('while(1);',2)[1]);

        // create foldersMap if this is the first time getting folders for course
        if (course.foldersMap === undefined) {
            course.foldersMap = new Map();
        }

        // add folder names to course div
        for (i = 0; i < JSONresponseArray.length; i++) {
            var nodeDiv = document.createElement('div');
            var nodeP = document.createElement('p');
            var nodeText = document.createTextNode(JSONresponseArray[i].name);
            nodeP.appendChild(nodeText);
            nodeDiv.appendChild(nodeP);
            course.div.appendChild(nodeDiv);

            // add folder to map with id as key and folder object as value
            var folderObj = new folder(JSONresponseArray[i], nodeDiv);
            course.foldersMap.set(JSONresponseArray[i].id, folderObj);

            // if current folder does not have a parent, set it as the root folder
            if (JSONresponseArray[i].parent_folder_id == null) {
                course.folderRootId = JSONresponseArray[i].id;
            }
        }

        // if results were returned, get next page of folders, otherwise get files
        if (JSONresponseArray.length > 0) {
            getFoldersList(page + 1, course);
        } else {
            getFilesList(1, course);
        }
    }

	var request = new XMLHttpRequest();
    // call requestListener when request is loaded
	request.addEventListener('load', requestListener);
	request.open('GET', 'https://canvas.ucdavis.edu/api/v1/courses/' + course.courseJSON.id
        + '/folders?page=' + page + '&per_page=100');
    request.send();
}

function getCoursesList(page) {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split('while(1);',2)[1]);
        // sort courses by term
        JSONresponseArray.sort(function(a, b){return b.enrollment_term_id - a.enrollment_term_id});
        // get div for course list
        var coursesDiv = document.getElementById('courses');

        // add course names to page
        for (i = 0; i < JSONresponseArray.length; i++) {
            if (JSONresponseArray[i].hasOwnProperty('name')) {
                var courseDiv = document.createElement('div');
                var courseNameHeader = document.createElement('h1');
                var courseNameP = document.createElement('p');
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
	request.addEventListener('load', requestListener);
	request.open('GET', 'https://canvas.ucdavis.edu/api/v1/courses/?page=' + page
        + '&per_page=100');
    request.send();
}

getCoursesList(1);
