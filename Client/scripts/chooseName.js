"use strict" // Enables strict mode

// Get all the relevant UI elements
const nameForm = $( "#nameForm" )
const continueButton = $( "#continueButton" )
const continueButtonSpinner = $( "#continueButtonSpinner" )
const nameInput = $( "#nameInput" )

// The regular expression for validating the name (alphanumeric characters, 2 to 30)
// NOTE: Keep this the same as the one on the server!
const nameValidationPattern = new RegExp( /^[A-Za-z0-9_]{2,30}$/ )

// Changes the form's visual loading state
function setFormLoading( isLoading ) {

	// Disable form controls, and show the loading spinner
	if ( isLoading === true ) {
		nameInput.prop( "disabled", true )
		continueButton.prop( "disabled", true )

		continueButtonSpinner.removeClass( "visually-hidden" )
		continueButtonSpinner.attr( "aria-hidden", "false" )
	
	// Otherwise enable form controls, and hide the loading spinner
	} else {
		nameInput.prop( "disabled", false )
		continueButton.prop( "disabled", false )

		continueButtonSpinner.addClass( "visually-hidden" )
		continueButtonSpinner.attr( "aria-hidden", "true" )
	}

}

// Runs when the name form is submitted...
nameForm.submit( ( event ) => {

	// Stop the default form redirect from happening
	event.preventDefault()
	event.stopPropagation()

	// Show any Bootstrap input validation messages
	nameForm.addClass( "was-validated" )

	// Get the name that was entered
	const desiredName = nameInput.val()

	// Do not continue if form validation fails
	if ( nameForm[ 0 ].checkValidity() !== true ) return

	// Fail if the manual input validation fails
	if ( nameValidationPattern.test( desiredName ) !== true ) return showFeedbackModal( "Notice", "The name you have entered is invalid." )

	// Hide any Bootstrap input validation messages
	nameForm.addClass( "was-validated" )

	// Change UI to indicate loading
	setFormLoading( true )

	// Get the request information from the form attributes
	const requestMethod = nameForm.attr( "method" )
	const targetPath = nameForm.attr( "action" )

	// Send a request to the server API endpoint to pick this name...
	$.ajax( targetPath, {

		// Set the content type & payload
		contentType: "application/json",
		data: JSON.stringify( {
			name: desiredName
		} ),

		// Set the expected response type
		dataType: "json",

		// Set the HTTP method (must be upper-case)
		method: requestMethod.toUpperCase(),

		// Event handler for when the request is successful
		success: ( responseData, textStatus, request ) => {

			// Change UI back as we're finished
			setFormLoading( false )

			// Redirect to the room list page
			window.location.href = "/room-list.html"

		},

		// Event handler for when the request fails
		error: ( request ) => {

			// Convert the response body to JSON
			try {
				const payload = JSON.parse( request.responseText )

				// Fail if the server didn't give us an error code
				if ( payload.error === undefined ) return showErrorModal( "An unknown server error occured" )

				// Fail if there is no message for this error code
				if ( serverErrorCodeMessages[ payload.error ] === undefined ) return showErrorModal( `An unhandled server error occured (${ payload.error })` )

				// Display the friendly error message as we have an error code
				showErrorModal( serverErrorCodeMessages[ payload.error ] )

			// Error if the response body cannot be converted to JSON
			} catch {
				return showErrorModal( "Failed to parse server response payload" )
			}

			// Change UI back as we're finished
			setFormLoading( false )

		}
	} )

} )

// Redirect to the room list page if we have already chosen a name
$( () => $.getJSON( "/api/name", ( payload ) => {
	if ( payload.hasName === true ) window.location.href = "/room-list.html"
} ) )
