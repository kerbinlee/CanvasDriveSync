function getFilesList(page, courseDiv, courseId) {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split('while(1);',2)[1]);

        // add file names to course div
        for (i = 0; i < JSONresponseArray.length; i++) {
            var node = document.createElement('p');
            var nodeText = document.createTextNode(JSONresponseArray[i].display_name);
            node.appendChild(nodeText);
            courseDiv.appendChild(node);
        }

        // if results were returned, get next page of files
        if (JSONresponseArray.length > 0) {
            getFilesList(page + 1, courseDiv, courseId);
        }
    }

	var request = new XMLHttpRequest();
    // call requestListener when request is loaded
	request.addEventListener('load', requestListener);
	request.open('GET', 'https://canvas.ucdavis.edu/api/v1/courses/' + courseId
        + '/files?page=' + page + '&per_page=100');
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
                var courseName = document.createTextNode(JSONresponseArray[i].name);
                courseNameHeader.appendChild(courseName);
                courseDiv.appendChild(courseNameHeader);
                coursesDiv.appendChild(courseDiv);

                var courseId = JSONresponseArray[i].id;
                // get list of files for course
                getFilesList(1, courseDiv, courseId);
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
