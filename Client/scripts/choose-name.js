"use strict" // Enables strict mode

// Get all the relevant UI elements
const nameForm = $( "#nameForm" )
const continueButton = $( "#continueButton" )
const continueButtonSpinner = $( "#continueButtonSpinner" )
const nameInput = $( "#nameInput" )

// Runs when the name form is submitted...
nameForm.submit( ( event ) => {

	// Stop the default form redirect from happening
	event.preventDefault()
	event.stopPropagation()

	// Show any validation messages
	nameForm.addClass( "was-validated" )

	// Get the name that was entered
	const userName = nameInput.val()

	// Do not continue if validation from attributes fails, or the name is invalid
	if ( !nameForm[ 0 ].checkValidity() || ( userName.length < 2 || userName.length > 30 ) ) {
		return
	}

	// Change UI to indicate loading
	nameInput.prop( "disabled", true )
	continueButton.prop( "disabled", true )
	continueButtonSpinner.removeClass( "visually-hidden" )
	continueButtonSpinner.attr( "aria-hidden", "false" )

	// Debugging
	console.log( nameForm.attr( "method" ), nameForm.attr( "action" ), userName )

	// TODO: Send request to server-side API

} )
