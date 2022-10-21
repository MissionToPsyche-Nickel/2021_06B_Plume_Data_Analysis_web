/*
---------------------------------------------------------------------------------
	ASU 06B-Psyche-Hall-Thruster-Plume-Data-Analysis

	@author Mitchell Bucklew mbucklew@asu.edu

	This main.js file contains the majority of the logic in the data visualization
	application contained in the home page

	Page Initialization

----------------------------------------------------------------------------------
*/

colors = ['#800080',
	'#6d0086',
	'#59008c',
	'#420091',
	'#290097',
	'#0e009d',
	'#000fa3',
	'#002ea8',
	'#004fae',
	'#0073b4',
	'#0098ba',
	'#00bfbf',
	'#00c5a1',
	'#00cb81',
	'#00d15f',
	'#00d73b',
	'#00dc14',
	'#15e200',
	'#3fe800',
	'#6cee00',
	'#9bf300',
	'#ccf900',
	'#ff0']

// Load Values from local storage
xmin = parseInt(window.localStorage.getItem('xmin'))
xmax = parseInt(window.localStorage.getItem('xmax'))
viewMode = parseInt(window.localStorage.getItem('view'))

// If values cannot be obtained from local storage, assign them to the default of -22 and 22
xmin = xmin ? xmin : -22
xmax = xmax ? xmax : 22

// Initialize variable controlling status of refresh button
needsRefresh = false

// Initialize all input data
totalData = [[],[],[]]

// Full screen feature
$('#toggle_fullscreen').on('click', function(){
	// if already full screen; exit
	// else go fullscreen
	if (
		document.fullscreenElement ||
		document.webkitFullscreenElement ||
		document.mozFullScreenElement ||
		document.msFullscreenElement
	) {
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		}
	} else {
		element = $('#myDiv').get(0);
		if (element.requestFullscreen) {
			element.requestFullscreen();
		} else if (element.mozRequestFullScreen) {
			element.mozRequestFullScreen();
		} else if (element.webkitRequestFullscreen) {
			element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		} else if (element.msRequestFullscreen) {
			element.msRequestFullscreen();
		}
		alert("Fullscreen mode activated. Press esc to leave.")
	}
});

// Ran upon page load, initializes the page contents
$( document ).ready(function() {
	// Set the custimizable custom primary color
	if (localStorage.getItem('color') !== null) {
		$("body").get(0).style.setProperty("--color-primary", localStorage.getItem('color'));
	}

	// Initialize the JQuery UI slider for the degree range
	$( "#slider-range" ).slider({
		range: true,
		min: -90,
		max: 90,
		values: [ xmin, xmax ],
		slide: function( event, ui ) {
			updateButton();
			window.localStorage.setItem('xmin',ui.values[ 0 ] )
			window.localStorage.setItem('xmax',ui.values[ 1 ] )
			xmin = ui.values[ 0 ]
			xmax = ui.values[ 1 ]

			if(ui.values[ 0 ] != -22 && ui.values[ 1 ] != 22) {
				updateButton();
			}

			$( "#leftS" ).val( ui.values[ 0 ] );
			$( "#rightS" ).val( ui.values[ 1 ] );

		}
	});

	// Add listeners for the left and right input elements on the slider
	$( "#leftS" ).val(xmin).bind("change paste keyup", function() { filterRangeInput(0,$(this)); updateButton(); });
	$( "#rightS" ).val(xmax).bind("change paste keyup", function() { filterRangeInput(1,$(this)); updateButton(); });

	// Check to see if data already exists in local storage
	loadedData = window.localStorage.getItem('totalData');

	// If data already exists, then we can show the graph on page load
	if (loadedData) {
		totalData = JSON.parse(loadedData);
		showGraph();
	}

	// Add button listeners below for copy to clipboard features
	$("#clearConsole").click(clearConsole);

	$("#copyCentroid").click(function() {
		copyToClipboard(
			window.localStorage.getItem("xCentroid") + ", "
			+ window.localStorage.getItem("yCentroid") + ", "
			+ window.localStorage.getItem("zCentroid"))
	});

	$("#copyDegree").click(function() {
		copyToClipboard(window.localStorage.getItem("degree"))
	});

	$("#copyPolar").click(function() {
		copyToClipboard(
			$("#radius").val() + ", "
			+ $("#theta").val() + ", "
			+ $("#phi").val())
	});

	// Add a listener to the refresh button
	$( "#refresh").click(function() {
		showGraph();
	});

	if ($("#selectView").val() == "curve") {
		disableSlider();
	}

	if ($( "#selectView").val() === "line" || $( "#selectView").val() == "histogram") {
		$("#colorScale").prop( "disabled", true );
	} else {
		$("#colorScale").prop( "disabled", false );
	}

	$( "#selectView").change(function() {
		if ($( "#selectView").val() === "curve" || ($( "#selectView").val() !== "curve" && $("#leftS").is(':disabled'))) {
			disableSlider();
		}
		if ($( "#selectView").val() === "line") {
			$("#colorScale").prop( "disabled", true );
		} else {
			$("#colorScale").prop( "disabled", false );
		}


		updateButton();
	});

	$("#tutorial").click(function() {
		introJs().start();
	});

	$("#resetAngle").click(function() {
		$("#leftS").val("-22");
		$("#rightS").val("-22");

		$("#slider-range").slider('values', 0, -22);
		$("#slider-range").slider('values', 1, 22);
		xmin = -22
		xmax = 22
		window.localStorage.setItem('xmin', -22)
		window.localStorage.setItem('xmax', 22)
		updateButton();
	})



	updateDataView(window.localStorage.getItem("xCentroid"),
		window.localStorage.getItem("yCentroid"),
		window.localStorage.getItem("zCentroid"),
		window.localStorage.getItem("degree"),
		window.localStorage.getItem("radius"),
		window.localStorage.getItem("phi"),
		window.localStorage.getItem("theta")
	)

	// Add secondary class, remove primary class, and disable the refresh button
	$('#refresh').addClass('secondary').removeClass('primary').prop('disabled', true);

	document.getElementById("codeTag").innerHTML = window.localStorage.getItem("log")
	document.getElementById('input').addEventListener("click", clickButton,false);
	document.getElementById('inputFile').addEventListener("change", uploadFile,false);

	document.getElementById('colorScale').addEventListener("change", updateButton,false);

	console.log( "ready!" );
});


/*
---------------------------------------------------------------------------------
	Function Declarations
----------------------------------------------------------------------------------
*/

// Function for creating the graph with different modes
function updateGraph(xyzdata, mode, type) {
	updateConsole("Updating Graph", "");
	let colorScheme = $("#colorScale").val();

	const traces = [];
	heat = []

	const layout = {
		scene: {
			aspectmode: "manual",
			aspectratio: {
				x: 1, y: 1, z: 1,
			},
			xaxis: {title: 'x Probe angle, deg', range: [xmin, xmax]},
			yaxis: {title: 'y Sweep angle, deg', range: [xmin, xmax]},
			zaxis: {title: 'z Probe current, normalized'},
		},
		showlegend: false,
		paper_bgcolor: viewMode ? "#050015" : "white"
	};

	for (var i = 0; i < xyzdata[0].length; i++) {
		for (var j = 0; j < xyzdata[1].length; j++) {
			heat.push(xyzdata[2][i][j])
		}
	}

	if (colorScheme == "psyche") {
		colorScheme = [[0, 'rgb(48, 33, 68)'],[0.2, 'rgb(89, 38, 81)'],[0.4, 'rgb(165, 63, 91)'],[0.6, 'rgb(239, 89, 102)'], [0.8, 'rgb(244, 124, 51)'],[1, 'rgb(249, 160, 0)'] ]
	}

	if (viewMode) {
		layout['scene']['yaxis']['titlefont'] = {color: '#f5f5f5'}
		layout['scene']['xaxis']['titlefont'] = {color: '#f5f5f5'}
		layout['scene']['xaxis']['tickfont'] = {color: '#f5f5f5'}
		layout['scene']['yaxis']['tickfont'] = {color: '#f5f5f5'}

		layout['scene']['zaxis']['tickfont'] = {color: '#f5f5f5'}
		layout['scene']['zaxis']['titlefont'] = {color: '#f5f5f5'}

	}
	var hoverText = [];
	// For the surface, contour, and scatter plot graph
	if(type == "mesh3d" || type == "contour" || mode == "markers") {

		x = []
		y = []
		z = []

		// Loop through every collector
		for (var i = 0; i < xyzdata[0].length; i++) {
			if (type == "contour") {

				// Loop through every degree
				for (var j = 0; j < xyzdata[1].length; j++) {
					if (xyzdata[1][j] >= xmin && xyzdata[1][j] <= xmax && xyzdata[0][i][j] >= xmin && xyzdata[0][i][j] <= xmax) {
						x.push(xyzdata[0][i][j])
						y.push(xyzdata[1][j])
						z.push(xyzdata[2][i][j])
						hoverText.push("Probe #:" + (i + 1).toString() + "<br>Theta: " + (xyzdata[1][j]).toString() + "<br>Phi:" + (-22 + i * 2 + 90).toString());

					}
				}
			} else {
				x = x.concat(xyzdata[0][i])
				y = y.concat(xyzdata[1])
				z = z.concat(xyzdata[2][i])

				for (var j = 0; j < xyzdata[1].length; j++) {
					hoverText.push("Probe #:" + (i + 1).toString() + "<br>Theta: " + (xyzdata[1][j]).toString() + "<br>Phi:" + (-22 + i * 2 + 90).toString());
				}
			}
		}

		var trace = {
			x: x, y: y, z: z,
			name: '',
			type: type,
			mode: mode,
			colorscale: colorScheme,
			contour_show: true,
			contour_width: 2,
			intensity: z,
			hovertext: hoverText,
			marker: {
				color: z,
				colorscale: colorScheme,
				size: 4,
				x0:xmin,
				y0:xmin,
				colorbar: { thickness:20 }
			},
			contours: {
				showlabels: true,
			}
		};

		traces.push(trace);

	} else if (type == "curve") {
		r = 3

		x = []
		y = []
		z = []
		hoverText = []

		for (var i = 0; i < xyzdata[0].length; i++) {
			for (var j = 0; j < xyzdata[1].length; j++) {

				alpha = toRadians(xyzdata[1][j])
				polar = toRadians(-22+i*2+90)

				x.push(r * Math.sin(polar) * Math.cos(alpha))
				y.push(r * Math.sin(polar) * Math.sin(alpha))
				z.push(r * Math.cos(polar))

				hoverText.push("Probe #:" + (i+1).toString() + "<br>Theta: "+ (xyzdata[1][j]).toString() +"<br>Phi:" + (-22+i*2+90).toString() )
			}
		}

		layout["scene"]["xaxis"]["title"] = ""
		layout["scene"]["zaxis"]["title"] = "z Probe Angle"

		layout["scene"]["yaxis"]['range'] = [Math.min.apply(Math, y),Math.max.apply(Math, y)]
		layout["scene"]["xaxis"]['range'] = []
		layout["scene"]["xaxis"]['showticklabels'] = false


		layout["scene"]["yaxis"]['ticktext'] = ['0',
			Math.min.apply(Math, xyzdata[1]).toFixed(0)+"°",
			(Math.min.apply(Math, xyzdata[1])/2).toFixed(0) +"°",
			Math.max.apply(Math, xyzdata[1]).toFixed(0)+"°",
			(Math.max.apply(Math, xyzdata[1])/2).toFixed(0)+"°"]

		layout["scene"]["yaxis"]['tickvals'] = [0,
			Math.min.apply(Math, y),
			Math.min.apply(Math, y)/2,
			Math.max.apply(Math, y),
			Math.max.apply(Math, y)/2]

		layout["scene"]["zaxis"]['ticktext'] = ['0',"-22°","22°","-11°","11°"]
		layout["scene"]["zaxis"]['tickvals'] = ['0',
			Math.min.apply(Math, z),
			Math.max.apply(Math, z), +
				Math.min.apply(Math, z)/2,
			Math.max.apply(Math, z)/2]

		layout["scene"]["aspectratio"] = {}

		var trace = {
			x: x,
			y: y,
			z: z,
			name: '',
			type: "scatter3d",
			mode: "markers",
			colorscale: colorScheme,
			contour_show: true,
			contour_width: 2,
			intensity: heat,
			hovertext: hoverText,
			marker: {
				color: heat,
				colorscale: colorScheme,
				size: 4,
				colorbar: { thickness:20 }
			},
		}

		traces.push(trace)

		var text = "r: " + $("#radius").val() + "<br>" +
				   "phi: " + $("#phi").val() + "<br>" +
			       "theta: " + $("#theta").val() + "<br>";

		var trace = {
			x: [window.localStorage.getItem("xCentroid")], y: [window.localStorage.getItem("yCentroid")], z: [window.localStorage.getItem("zCentroid")],
			name: 'Centroid',
			type: "scatter3d",
			mode: "markers",
			hovertext: text,

			marker: {
				color: 'red',
				size: 10
			}
		}

		traces.push(trace)

	} else if (type == "histogram") {
		var trace = {
			x: xyzdata[1],
			type: 'histogram',
			marker: {
				color: "rgba(152,152,152,0.7)",
				line: {
					color:  $("body").get(0).style.getPropertyValue("--color-primary"),
					width: 1
				}
			}
		};
		layout['xaxis'] = {title: "Degree"}
		layout['yaxis'] = {title: "Count"}
		layout['xaxis']['tickfont'] = {color: '#f5f5f5'}

		if (viewMode) {
			layout['xaxis']['tickfont'] = {color: '#f5f5f5'}
			layout['xaxis']['titlefont'] = {color: '#f5f5f5'}

			layout['yaxis']['tickfont'] = {color: '#f5f5f5'}
			layout['yaxis']['titlefont'] = {color: '#f5f5f5'}

		}

		traces.push(trace)

	} else {
		// For the line plot
		for (var j = 0; j < xyzdata[1].length; j++) {
			hoverText.push("Probe #:" + (i + 1).toString() + "<br>Theta: " + (xyzdata[1][j]).toString() + "<br>Phi:" + (-22 + i * 2 + 90).toString());
		}
		for (var i = 0; i < xyzdata[0].length; i++) {
			var trace = {
				x: xyzdata[0][i], y: xyzdata[1], z: xyzdata[2][i],
				name: '',
				type: type,
				mode: mode,
				showscale: false,
				hovertext:hoverText,
				marker: {
					color: colors[i],
					size: 8
				}
			}

			traces.push(trace)
		}
	}

	newPlot = Plotly.newPlot('myDiv', traces, layout,{displayModeBar: true,responsive:true});
}

// Convert Angle to Radians
function toRadians (angle) {
	return angle * (Math.PI / 180);
}

function toDegrees (angle) {
	return angle * (180 / Math.PI);
}

// Function that is called after update button is clicked
function updateButton() {
	if (!needsRefresh) {
		needsRefresh = true
		$('#refresh').addClass('primary').removeClass('secondary');
		$('#refresh').prop('disabled', false);
	}
}

// This function decides which graph should be shown and calls the updateGraph function accordingly
function showGraph() {
	if (totalData == [[],[],[]]) {
		return
	}

	let selectvalue = $("#selectView").val()
	if (selectvalue === "line") {
		updateGraph(totalData, "lines", "scatter3d")
	} else if (selectvalue === "scatter") {
		updateGraph(totalData,"markers","scatter3d")
	} else if (selectvalue === "surface"){
		updateGraph(totalData,"","mesh3d")
	} else if (selectvalue === "contour"){
		updateGraph(totalData,"","contour")
	} else if (selectvalue === "curve"){
		updateGraph(totalData,"","curve")
	} else {
		updateGraph(totalData,"","histogram")
	}

	needsRefresh = false

	$('#refresh').addClass('primary').removeClass('secondary');
	$('#refresh').prop('disabled', true);

}

// Function for calculating the weighted average
function weightedAverage(data,weights) {
	sumWeights = 0
	wumDataWeights = 0

	for (var i = 0; i < data.length; i++) {
		wumDataWeights += data[i]*weights[i]
		sumWeights += weights[i]
	}
	return wumDataWeights/sumWeights;
}

// Function for first parsing the data as it si uploaded using the upload file button
function makeplot(input) {

		totalData = [[],[],[]]

		data = input.split("\r\n")

		var i = 0;

		while(i < data.length) {
			if(data[i] == "") {
				data.splice(i, 1);
				i--;
			} else {
				data[i] = data[i].split("\t")
			}

			i++;
		}

		setDegrees = false

		for (var j = 0; j < 23; ++j) {

			z = [];
			y = [];
			x = [];

			for (var i = 0; i < data.length; ++i) {
				if(!setDegrees) {
					y.push(data[i][0]);
				}

				z.push(-1*data[i][j+1]);

			}

			for (var q = 0; q < data.length; q++) {
				x.push(-22 + j * 2);
			}

			totalData[0].push(x)

			// In this part we only need to do this once since all degrees are the same
			if(!setDegrees) {
				setDegrees = true
				totalData[1] = y;
			}

			totalData[2].push(z)

		}

		x = []
		y = []
		z = []
		heat = []
		r=3
		for (var i = 0; i < totalData[0].length; i++) {
			for (var j = 0; j < totalData[1].length; j++) {
				let theta = toRadians(totalData[1][j])
				let phi = toRadians(-22+i*2+90)

				heat.push(totalData[2][i][j])

				x.push(r * Math.sin(phi) * Math.cos(theta))
				y.push(r * Math.sin(phi) * Math.sin(theta))
				z.push(r * Math.cos(phi))

			}
		}

		const centroid = [weightedAverage(x, heat), weightedAverage(y, heat), weightedAverage(z, heat)];

		var x = centroid[0]
		var y = centroid[1]
		var z = centroid[2]

		// r = sqrt ( x^2 + y^2 + z^2 )
		const radius = Math.sqrt(x*x + y*y + z*z);

		// phi (ϕ) = arctan ( sqrt( x^2 + y^2 ) / z )
		const phi = Math.atan(Math.sqrt(x*x + y*y) / z)

		// theta (θ) = arctan ( y/x )
 		const theta = Math.atan(y/x)

		const degree = Math.acos(x / radius );

		updateDataView(centroid[0],centroid[1],centroid[2], degree, radius, toDegrees(phi), toDegrees(theta))

		window.localStorage.setItem("xCentroid",centroid[0]);
		window.localStorage.setItem("yCentroid",centroid[1]);
		window.localStorage.setItem("zCentroid",centroid[2]);

		window.localStorage.setItem("radius",radius);
		window.localStorage.setItem("phi",phi);
		window.localStorage.setItem("theta",theta);

		window.localStorage.setItem("degree",degree);


		// Update refresh button
		$('#refresh').addClass('primary').removeClass('secondary');
		$('#refresh').prop('disabled', false);
		window.localStorage.setItem('totalData', JSON.stringify(totalData));
}

function resP(id){
	var d3 = Plotly.d3;

	var parent_width = $("#"+id).parent().width()
	var gd3 = d3.select(`div[id=${id}]`)
		.style({
			height: "80vh"
			//'margin-right': (100 - WIDTH_IN_PERCENT_OF_PARENT) / 2 + 'vh',
			//'margin-top': (100 - HEIGHT_IN_PERCENT_OF_PARENT) / 2 + 'vh'
		});
	return gd3.node();
}


resP('myDiv')
// Function for updating conents of the web page console
function updateConsole(data, type) {
	var d = new Date();
	date = d.getMonth() + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
	if (date.length < 11) {
		for (var i = 0; i <= 11-date.length; i++) {
			date += " ";
		}
	}
	if (type === "error") {
		format = "<div class='error'>" +date+ " " + data + "</div>"
		window.localStorage.setItem("log",window.localStorage.getItem("log")+format)
		document.getElementById("codeTag").innerHTML += format;
	} else {
		format = "<div class='regular'>" +date+ " " + data + "</div>"
		window.localStorage.setItem("log",window.localStorage.getItem("log")+format)
		document.getElementById("codeTag").innerHTML += format;
	}
}

// Display the centroid calculation on the web pag
function updateDataView(xCentroid,yCentroid,zCentroid,degree,r,phi,theta) {
	$("#xCentroid").val(xCentroid)
	$("#yCentroid").val(yCentroid)
	$("#zCentroid").val(zCentroid)

	$("#radius").val(r)
	$("#phi").val(phi)
	$("#theta").val(theta)

	$('#cDegree').val(degree)

}

// Clear the contents of the Console
function clearConsole(){
	window.localStorage.setItem("log","")
	document.getElementById("codeTag").innerHTML = "";
}

// Function which is called after the upload file button is used to upload data
function uploadFile() {
	updateConsole("Uploading Data", "info")
	const selectedFile = document.getElementById('inputFile').files[0];

	if (selectedFile.type !== "text/plain") {
		updateConsole("Failed to read file, invalid type", "error");
		return
	}

	var reader = new FileReader();
	try {
		reader.readAsText(selectedFile, "UTF-8");

		reader.onload = function (evt) {
			makeplot(evt.target.result)
		}
	} catch(e) {
		updateConsole("Failed to read file, invalid type", "error");
	}

}

// Programming the upload button
function clickButton() {
	$("#inputFile").click()
}

function isNumeric(value) {
	return /^-?\d+$/.test(value);
}

function copyToClipboard(text) {
	var $temp = $("<input>");
	$("body").append($temp);
	$temp.val(text).select();
	document.execCommand("copy");
	$temp.remove();
	alert('Copied to Clipboard')
}

// For the two inputs on either end of the degree range slider
function filterRangeInput(type,self) {
	let val = self.val()
	self.removeClass('errorText');

	if(isNumeric(val)) {
		val = parseInt(val)
		if(val >= - 90 && val <= 90) {
			if (type === 0 && val < $("#rightS").val()) {
				$("#slider-range").slider('values', type, val);
				window.localStorage.setItem('xmin', val)
				return
			} else if (val > $("#leftS").val()) {
				$("#slider-range").slider('values', type, val);
				window.localStorage.setItem('xmax', val)
				return
			}
		}
	}
	self.addClass('errorText');

}

function disableSlider() {
	if ($("#leftS").is(':disabled')) {
		$("#leftS").prop( "disabled", false );
		$("#rightS").prop( "disabled", false );
		$( "#slider-range" ).slider('enable')
	} else {
		$("#leftS").prop( "disabled", true );
		$("#rightS").prop( "disabled", true );

		$( "#slider-range" ).slider('disable')
	}
}