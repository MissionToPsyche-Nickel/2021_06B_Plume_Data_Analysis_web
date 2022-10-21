
totalData = [[],[],[]]
$( document ).ready(function() {

	$("#colorModule").change(function() {
		window.localStorage.setItem("color", $(this).val())
		$("body").get(0).style.setProperty("--color-primary", $(this).val());
	});

	if (localStorage.getItem('color') !== null) {
		$("body").get(0).style.setProperty("--color-primary", localStorage.getItem('color'));
		$("#colorModule").val(localStorage.getItem('color'))
	} else {
		$("#colorModule").val('purple');
	}

});
