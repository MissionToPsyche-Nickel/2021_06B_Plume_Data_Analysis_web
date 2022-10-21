/*
---------------------------------------------------------------------------------
	ASU 06B-Psyche-Hall-Thruster-Plume-Data-Analysis

	@author Mitchell Bucklew mbucklew@asu.edu
---------------------------------------------------------------------------------
*/

viewMode = parseInt(window.localStorage.getItem('view'))

// Similary to above, if viewmode has not been set yet default it to 0 which is the light theme
viewMode = viewMode ? viewMode : 0

function setViewMode(mode) {
    if(mode == 1) {
        // Set Dark Mode
        $("#lightIcon").hide()
        $("#darkIcon").show()

        $("body").addClass("dark")
        window.localStorage.setItem('view', 1)
    } else {
        $("#lightIcon").show()
        $("#darkIcon").hide()

        $("body").removeClass("dark")
        window.localStorage.setItem('view', 0)
    }

    if (typeof totalData !== 'undefined' && totalData[0].length !== 0) {
        showGraph();
    }
}

// Add a listener to the view mode change button
$( "#viewMode" ).click(function() {
    if (viewMode === 0) {
        viewMode = 1
    } else {
        viewMode = 0
    }
    setViewMode(viewMode)
});

$( document ).ready(function() {

// If ViewMode is dark, apply dark theme
    if(viewMode === 1) {
        setViewMode(1)
    }
});
