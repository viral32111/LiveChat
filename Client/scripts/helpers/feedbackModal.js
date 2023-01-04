"use strict" // Enables strict mode

// Get all the relevant UI elements
const feedbackModal = $( "#feedbackModal" )
const feedbackModalTitle = $( "#feedbackModalTitle" )
const feedbackModalMessage = $( "#feedbackModalMessage" )

// Create a Bootstrap modal from the feedback modal element on the page
const feedbackBootstrapModal = new bootstrap.Modal( feedbackModal )

// Shows the user feedback in a popup window
function showFeedbackModal( title, message, onClosedCallback = undefined ) {

	// Fail if invalid parameters were given
	if ( title === undefined || title.length <= 0 ) return console.error( "Title is required for the feedback modal" )
	if ( message === undefined || message.length <= 0 ) return console.error( "Message is required for the feedback modal" )

	// Set the title & message text on the modal
	feedbackModalTitle.text( title )
	feedbackModalMessage.text( message )

	// If a callback was given, run it when the modal finishes cloding
	if ( onClosedCallback !== undefined ) feedbackModal.one( "hidden.bs.modal", onClosedCallback )

	// Show the modal
	feedbackBootstrapModal.show()

}

// Helper function to show the user an error
const showErrorModal = ( message, onClosedCallback = undefined ) => showFeedbackModal( "Error", `${ message }. Please try again later.`, onClosedCallback )
