// Enables/disables a button & shows/hides the button's loading spinner, to make a button appear to be loading
function setButtonLoading( buttonElement, isLoading ) {
	if ( isLoading === true ) {
		buttonElement.prop( "disabled", true )
		buttonElement.find( "span.spinner-border" ).removeClass( "visually-hidden" ).attr( "aria-hidden", "false" )
	} else {
		buttonElement.prop( "disabled", false )
		buttonElement.find( "span.spinner-border" ).addClass( "visually-hidden" ).attr( "aria-hidden", "true" )
	}
}


// Enables/disables all form controls, to make a form appear to be loading
function setFormLoading( formElement, isLoading ) {
	if ( isLoading === true ) formElement.find( "input, button" ).prop( "disabled", true )
	else formElement.find( "input, button" ).prop( "disabled", false )
	setButtonLoading( formElement.find( "button" ), isLoading )
}
