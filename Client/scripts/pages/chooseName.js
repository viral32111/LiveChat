"use strict" // Enables strict mode

// Get all the relevant UI elements
const nameForm = $( "#nameForm" )
const continueButton = $( "#continueButton" )
const continueButtonSpinner = $( "#continueButtonSpinner" )
const nameInput = $( "#nameInput" )

// The regular expression for validating the name (alphanumeric characters, 2 to 30)
// NOTE: Keep this the same as the one on the server!
const nameValidationPattern = new RegExp( /^[A-Za-z0-9_]{2,30}$/ )

// Runs when the name form is submitted...
nameForm.submit( ( event ) => {

	// Stop the default form redirect from happening
	event.preventDefault()
	event.stopPropagation()

	// Show any Bootstrap input validation messages
	nameForm.addClass( "was-validated" )

	// Do not continue if form validation fails
	if ( nameForm[ 0 ].checkValidity() !== true ) return

	// Get the name that was entered
	const desiredName = nameInput.val()

	// Fail if the manual input validation fails
	if ( nameValidationPattern.test( desiredName ) !== true ) return showFeedbackModal( "Notice", "The name you have entered is invalid." )

	// Hide any Bootstrap input validation messages
	nameForm.addClass( "was-validated" )

	// Change UI to indicate loading
	setFormLoading( nameForm, true )

	// Get the request information from the form attributes
	const requestMethod = nameForm.attr( "method" )
	const targetPath = nameForm.attr( "action" )

	// Send a request to the server API endpoint to pick this name...
	$.ajax( targetPath, {

		// Set the content type & payload
		contentType: "application/json",
		data: JSON.stringify( {
			desiredName: desiredName
		} ),

		// Expected response type is JSON so it's automatically parsed
		dataType: "json",

		// HTTP method must be upper-case
		method: requestMethod.toUpperCase(),

		// Redirect to the room list page, if the request was successful
		success: ( responseData, _, request ) => {
			if ( responseData.chosenName === desiredName ) {
				window.location.href = "/rooms.html"
			} else {
				console.error( `Server API sent back a name '${ responseData.chosenName }' that does not match the desired name '${ desiredName }'?` )
				showErrorModal( "Server sent back mismatching chosen name" )
			}
		},

		// Display any errors that occur if the request fails
		error: ( request, _, httpStatusMessage ) => {
			console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when sending request to choose name` )
			handleServerErrorCode( request.responseText )
		},

		// Always change UI back after the request so the user can try again
		complete: () => setFormLoading( nameForm, false )

	} )

} )

// Redirect to the room list page if we have already chosen a name
$( () => $.getJSON( "/api/name", ( payload ) => {
	if ( payload.hasName === true ) window.location.href = "/rooms.html"
} ).fail( ( request, _, httpStatusMessage ) => {
	console.error( `Received HTTP status message '${ httpStatusMessage }' when checking if we have chosen a name` )
	handleServerErrorCode( request.responseText )
} ) )
