function getCoursesList() {
    // function that is called when data is returned
    function requestListener() {
        // remove while(1); from beginning of returned JSON string
        var JSONresponseArray = JSON.parse(this.responseText.split('while(1);',2)[1]);
        JSONresponseArray.sort(function(a, b){return b.enrollment_term_id - a.enrollment_term_id});
        // get div for course list
        var pgh = document.getElementById('courses');

        // add course names to page
        for (i = 0; i < JSONresponseArray.length; i++) {
            if (JSONresponseArray[i].hasOwnProperty('name')) {
                var node = document.createElement('p');
                var nodeText = document.createTextNode(JSONresponseArray[i].name);
                node.appendChild(nodeText);
                pgh.appendChild(node);
            }
        }
    }

	var request = new XMLHttpRequest();
    // call requestListener when request is loaded
	request.addEventListener('load', requestListener);
	request.open('GET', 'https://canvas.ucdavis.edu/api/v1/courses/?page=1&per_page=100');
    request.send();
}

getCoursesList();
