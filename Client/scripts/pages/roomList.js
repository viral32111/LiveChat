"use strict" // Enables strict mode

// Get all the relevant UI elements
const publicRoomsColumn1 = $( "#publicRoomsColumn1" )
const publicRoomsColumn2 = $( "#publicRoomsColumn2" )
const noPublicRoomsNotice = $( "#noPublicRoomsNotice" )
const joinPrivateRoomForm = $( "#joinPrivateRoomForm" )
const joinPrivateRoomCode = $( "#joinPrivateRoomCode" )
const createRoomForm = $( "#createRoomForm" )
const createRoomName = $( "#createRoomName" )
const createRoomNameVisibilityIcon = $( "#createRoomNameVisibilityIcon" )
const createRoomVisibilityButton = $( "#createRoomVisibilityButton" )
const endSessionButton = $( "#endSessionButton" )
const guestName = $( "#guestName" )

// The regular expressions for validating the room name & join codes
// NOTE: Keep these the same as they are on the server!
const roomNameValidationPattern = new RegExp( /^[\w\d .,()[\]<>+=\-!:;$£%&*#@?|]{1,50}$/ )
const joinCodeValidationPattern = new RegExp( /^[A-Za-z]{6}$/ )

// Creates all the HTML for a new room element, using data from the server API
function createRoomElement( name, participantCount, latestMessageSentAt, joinCode ) {

	// Construct last active text
	const lastActiveText = latestMessageSentAt === null ? "never been active" : `last active ${ unixTimestampToHumanReadable( latestMessageSentAt ) }`

	// Name & description
	const descriptionParagraphElement = $( "<p></p>" ).addClass( "m-0" ).text( `${ participantCount } participant(s), ${ lastActiveText }.` )
	const nameStrong = $( "<strong></strong>" ).text( name )
	const nameHeading = $( "<h5></h5>" ).addClass( "m-0" ).append( nameStrong )
	const informationColumn = $( "<div></div>" ).addClass( "col-10" ).append( nameHeading, descriptionParagraphElement )

	// Join button
	const joinButtonTextSpan = $( "<span></span>" ).text( "Join" )
	const joinButtonSpinnerSpan = $( "<span></span>" ).addClass( "spinner-border spinner-border-sm visually-hidden" ).attr( "role", "status" ).attr( "aria-hidden", true )
	const joinButton = $( "<button></button>" ).addClass( "btn btn-primary w-100 h-100" ).attr( "type", "submit" ).append( joinButtonSpinnerSpan, joinButtonTextSpan )
	const joinButtonColumnn = $( "<div></div>" ).addClass( "col-2" ).append( joinButton )

	// When the join button is clicked...
	joinButton.click( () => {

		// Disable the button & show the spinner
		joinButton.prop( "disabled", true )
		joinButtonSpinnerSpan.removeClass( "visually-hidden" ).attr( "aria-hidden", "false" )

		// Get the request information from the join private room form attributes as they are the same
		const requestMethod = joinPrivateRoomForm.attr( "method" ), targetRoute = joinPrivateRoomForm.attr( "action" )

		// Request that the server put us in this room
		httpRequest( requestMethod, `${ targetRoute }/${ joinCode }` ).done( ( roomJoinedPayload, _, request ) => {
			if ( roomJoinedPayload.code === joinCode ) {
				window.location.href = "/chat.html"
			} else {
				console.error( `Server API sent back a room code '${ roomJoinedPayload.code }' that does not match the expected code '${ joinCode }'?` )
				showErrorModal( "Server sent back mismatching room name" )
			}

		// Show any errors that occur if the request fails
		} ).fail( ( request, _, httpStatusMessage ) => {
			console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when attempting to create room` )
			handleServerErrorCode( request.responseText )

		// Always enable the button & hide the spinner after the request is finished
		} ).always( () => {
			joinButton.prop( "disabled", false )
			joinButtonSpinnerSpan.addClass( "visually-hidden" ).attr( "aria-hidden", "true" )
		} )

	} )

	// Bootstrap positioning & styling
	const bootstrapRow = $( "<div></div>" ).addClass( "row" ).append( informationColumn, joinButtonColumnn )
	return $( "<div></div>" ).addClass( "p-2 mb-2 border rounded bg-light" ).append( bootstrapRow )

}

// Adds a room element, created using the function above, to the page
function addRoomElementToPage( roomElement ) {

	// Get the number of room elements (children) in each column
	const roomsInColumn1 = publicRoomsColumn1.children().length, roomsInColumn2 = publicRoomsColumn2.children().length

	// Hide the no rooms notice, if this is the first room being added
	if ( roomsInColumn1 === 0 && roomsInColumn2 === 0 ) noPublicRoomsNotice.addClass( "visually-hidden" )

	// Add the room element to whichever column has the least rooms in it, for an even distribution
	if ( roomsInColumn1 <= roomsInColumn2 ) publicRoomsColumn1.append( roomElement )
	else publicRoomsColumn2.append( roomElement )

}

// Populates the page with the public room's fetched the server API
function populateRoomsOnPage() {
	$.getJSON( "/api/rooms", ( publicRoomsPayload ) => {
		publicRoomsColumn1.empty()
		publicRoomsColumn2.empty()
		noPublicRoomsNotice.removeClass( "visually-hidden" )

		for ( const publicRoom of publicRoomsPayload.publicRooms ) {
			addRoomElementToPage( createRoomElement( publicRoom.name, publicRoom.participantCount, publicRoom.latestMessageSentAt, publicRoom.joinCode ) )
		}
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		throw new Error( `Received '${ httpStatusMessage }' '${ request.responseText }' when fetching the list of public rooms` )
	} )
}

// When the join private room form is submitted...
joinPrivateRoomForm.submit( ( event ) => {
	
	// Stop the default form redirect from happening
	event.preventDefault()
	event.stopPropagation()

	// Show any Bootstrap input validation messages
	joinPrivateRoomForm.addClass( "was-validated" )

	// Do not continue if form validation fails
	if ( joinPrivateRoomForm[ 0 ].checkValidity() !== true ) return

	// Get the code from the input
	const joinCode = joinPrivateRoomCode.val()

	// Fail if the manual input validation fails
	if ( joinCodeValidationPattern.test( joinCode ) !== true ) return showFeedbackModal( "Notice", "The join code you have entered is invalid." )

	// Hide any Bootstrap input validation messages
	joinPrivateRoomForm.removeClass( "was-validated" )

	// Change UI to indicate loading
	setFormLoading( joinPrivateRoomForm, true )

	// Get the request information from the form attributes
	const requestMethod = joinPrivateRoomForm.attr( "method" ), targetRoute = joinPrivateRoomForm.attr( "action" )

	// Request the server API to put us into this room
	httpRequest( requestMethod, `${targetRoute}/${joinCode}` ).done( ( roomJoinedPayload, _, request ) => {
		if ( roomJoinedPayload.code === joinCode ) {
			window.location.href = "/chat.html"
		} else {
			console.error( `Server API sent back a room code '${ roomJoinedPayload.code }' that does not match the expected code '${ joinCode }'?` )
			showErrorModal( "Server sent back mismatching room name" )
		}

	// Display any errors that occur if the request fails
	} ).fail( ( request, _, httpStatusMessage ) => {
		console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when attempting to create room` )
		handleServerErrorCode( request.responseText )

	// Always change UI back after the request so the user can try again
	} ).always( () => setFormLoading( joinPrivateRoomForm, false ) )

} )

// When the create room form is submitted...
createRoomForm.submit( ( event ) => {

	// Stop the default form redirect from happening
	event.preventDefault()
	event.stopPropagation()

	// Show any Bootstrap input validation messages
	createRoomForm.addClass( "was-validated" )

	// Do not continue if form validation fails
	if ( createRoomForm[ 0 ].checkValidity() !== true ) return

	// Get the values from the inputs
	const roomName = createRoomName.val(), isRoomPrivate = createRoomVisibilityButton.text() === "Private"

	// Fail if the manual input validation fails
	if ( roomNameValidationPattern.test( roomName ) !== true ) return showFeedbackModal( "Notice", "The room name you have entered is invalid." )

	// Hide any Bootstrap input validation messages
	createRoomForm.removeClass( "was-validated" )

	// Change UI to indicate loading
	setFormLoading( createRoomForm, true )

	// Get the request information from the form attributes
	const requestMethod = createRoomForm.attr( "method" ), targetRoute = createRoomForm.attr( "action" )

	// Ask the server API to create the room...
	httpRequest( requestMethod, targetRoute, {
		name: roomName,
		isPrivate: isRoomPrivate

	// When the request is successful...
	} ).done( ( roomCreatedPayload, _, request ) => {
		if ( roomCreatedPayload.name === roomName ) {
			populateRoomsOnPage()
			// TODO: Redirect to new chat room
		} else {
			console.error( `Server API sent back a room name '${ roomCreatedPayload.name }' that does not match the expected name '${ roomName }'?` )
			showErrorModal( "Server sent back mismatching room name" )
		}

	// Display any errors that occur if the request fails
	} ).fail( ( request, _, httpStatusMessage ) => {
		console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when attempting to create room` )
		handleServerErrorCode( request.responseText )

	// Always change UI back after the request so the user can try again
	} ).always( () => setFormLoading( createRoomForm, false ) )

} )

// Swap the visibility button between public & private when clicked
createRoomVisibilityButton.click( () => {
	if ( createRoomVisibilityButton.text() === "Private" ) {
		createRoomVisibilityButton.text( "Public" ).removeClass( "btn-danger" ).addClass( "btn-success" )
		createRoomNameVisibilityIcon.removeClass( "bi-eye-slash-fill" ).addClass( "bi-eye-fill" )
	} else {
		createRoomVisibilityButton.text( "Private" ).removeClass( "btn-success" ).addClass( "btn-danger" )
		createRoomNameVisibilityIcon.removeClass( "bi-eye-fill" ).addClass( "bi-eye-slash-fill" )
	}

	createRoomVisibilityButton.blur() // Fixes an issue where the button goes white due to form-control Bootstrap class
} )

// When the end session button is clicked...
endSessionButton.click( () => {

	// Make the button appear to be loading
	setButtonLoading( endSessionButton, true )

	// Request that the server-side API end our session
	httpRequest( "DELETE", "/api/session" ).done( () => {
		showFeedbackModal( "Success", "Your chat session has been ended & all data has been erased. You will now be returned to the choose name page." )
		window.location.href = "/"
	} ).fail( ( request, _, httpStatusMessage ) => {
		console.error( `Received HTTP status message '${ httpStatusMessage }' '${ request.responseText }' when trying to end our session` )
		handleServerErrorCode( request.responseText )
	} ).always( () => setButtonLoading( endSessionButton, false ) ) // Return the button to normal

} )

// Try to fetch our name from the server API when the page loads...
$( () => $.getJSON( "/api/name", ( responsePayload ) => {
	if ( responsePayload.name !== null ) {
		guestName.text( responsePayload.name )
		populateRoomsOnPage()
	} else {
		showFeedbackModal( "Notice", "You have not yet chosen a name yet. Close this popup to be redirected to the choose name page.", () => {
			window.location.href = "/"
		} )
	}
} ).fail( ( request, _, httpStatusMessage ) => {
	handleServerErrorCode( request.responseText, () => {
		window.location.href = "/" // Redirect back to the choose name page to be safe, as we can't check if we have a name
	} )

	throw new Error( `Received HTTP status message '${ httpStatusMessage }' when fetching our name` )
} ) )
