"use strict" // Enables strict mode

// Get all the relevant UI elements
const nameForm = $( "#nameForm" )
const nameInput = $( "#nameInput" )

// The regular expression for validating the name (alphanumeric characters, 2 to 30)
// NOTE: Keep this the same as the one on the server!
const chosenNameValidationPattern = new RegExp( /^[A-Za-z0-9_]{2,30}$/ )

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
	if ( chosenNameValidationPattern.test( desiredName ) !== true ) return showFeedbackModal( "Notice", "The name you have entered is invalid." )

	// Hide any Bootstrap input validation messages
	nameForm.removeClass( "was-validated" )

	// Change UI to indicate loading
	setFormLoading( nameForm, true )

	// Get the request information from the form attributes
	const requestMethod = nameForm.attr( "method" ), targetRoute = nameForm.attr( "action" )

	// Ask the server API to give us this name...
	httpRequest( requestMethod, targetRoute, {
		desiredName: desiredName
	} ).done( ( responsePayload ) => {
		if ( responsePayload.chosenName === desiredName ) {
			window.location.href = "/rooms.html" // Redirect to the room list page, if the request was successful
		} else {
			showErrorModal( "Server sent back mismatching chosen name" )
			console.error( `Server API sent back a name '${ responsePayload.chosenName }' that does not match the desired name '${ desiredName }'?` )
		}
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when attempting to create room` )
	} ).always( () => setFormLoading( nameForm, false ) ) // Always change UI back after the request so the user can try again

} )

// Redirect to the room list page if we have already chosen a name
$( () => httpRequest( "GET", "/api/name" ).done( ( responsePayload ) => {
	if ( responsePayload.name !== null ) {
		showFeedbackModal( "Notice", "You have already chosen a name. Close this popup to be redirected to the room list page.", () => {
			window.location.href = "/rooms.html"
		} )
	}
} ).fail( ( request, _, httpStatusMessage ) => {
	handleServerErrorCode( request.responseText )
	console.error( `Received HTTP status message '${ httpStatusMessage }' when fetching our name` )
} ) )
