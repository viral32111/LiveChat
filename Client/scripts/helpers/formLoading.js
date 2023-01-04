// Enables/disables all form controls & shows/hides the button's loading spinner, to make a form appear to be loading
function setFormLoading( formElement, isLoading ) {
	if ( isLoading === true ) {
		formElement.find( "input, button" ).prop( "disabled", true )
		formElement.find( "button span.spinner-border" ).removeClass( "visually-hidden" ).attr( "aria-hidden", "false" )
	} else {
		formElement.find( "input, button" ).prop( "disabled", false )
		formElement.find( "button span.spinner-border" ).addClass( "visually-hidden" ).attr( "aria-hidden", "true" )
	}
}
