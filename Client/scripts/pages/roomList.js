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
const roomNameValidationPattern = new RegExp( /^[\w\d .,'()[\]<>+=\-!:;$£%&*#@?|]{1,50}$/ )
const joinCodeValidationPattern = new RegExp( /^[A-Za-z]{6}$/ )

// Creates all the HTML for a new room element, using data from the server API
function createRoomElement( name, participantCount, latestMessageSentAt, joinCode ) {

	// Construct last active text
	const lastActiveText = latestMessageSentAt === null ? "never been active" : `last active ${ dateTimeToHumanReadable( latestMessageSentAt ) }`

	// Name & description
	const descriptionParagraphElement = $( "<p></p>" ).addClass( "m-0" ).text( `${ participantCount } participant(s), ${ lastActiveText }.` )
	const nameStrong = $( "<strong></strong>" ).text( name )
	const nameHeading = $( "<h5></h5>" ).addClass( "m-0" ).append( nameStrong )
	const informationColumn = $( "<div></div>" ).addClass( "col-10" ).append( nameHeading, descriptionParagraphElement )

	// Join button
	const joinButton = $( "<button></button>" ).addClass( "btn btn-primary w-100 h-100" ).attr( "type", "submit" ).text( "Join" )
	const joinButtonColumnn = $( "<div></div>" ).addClass( "col-2" ).append( joinButton )

	// When the join button is clicked...
	joinButton.click( () => {

		// Disable the button & show the spinner
		setButtonLoading( joinButton, true )

		// Get the request information from the join private room form attributes as they are the same
		const requestMethod = joinPrivateRoomForm.attr( "method" ), targetRoute = joinPrivateRoomForm.attr( "action" )

		// Request the server API to put us in this room
		httpRequest( requestMethod, `${ targetRoute }/${ joinCode }` ).done( ( roomJoinedPayload ) => {
			if ( roomJoinedPayload.code === joinCode ) {
				window.location.href = "/chat.html"
			} else {
				showErrorModal( "Server sent back mismatching room name" )
				console.error( `Server API sent back a room code '${ roomJoinedPayload.code }' that does not match the expected code '${ joinCode }'?` )
			}
		} ).fail( ( request, _, httpStatusMessage ) => {
			handleServerErrorCode( request.responseText )
			console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when attempting to create room` )
		} ).always( () => setButtonLoading( joinButton, false ) )

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
	httpRequest( "GET", "/api/rooms" ).done( ( publicRoomsPayload ) => {
		publicRoomsColumn1.empty()
		publicRoomsColumn2.empty()
		noPublicRoomsNotice.removeClass( "visually-hidden" )

		for ( const publicRoom of publicRoomsPayload.publicRooms ) {
			addRoomElementToPage( createRoomElement( publicRoom.name, publicRoom.guestCount, publicRoom.latestMessageSentAt, publicRoom.joinCode ) )
		}
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when fetching the list of public rooms` )
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

	// Request the server API to put us into this room
	joinRoom( joinCode ).always( () => setFormLoading( joinPrivateRoomForm, false ) ) // Always change UI back after the request so the user can try again

} )

// Requests the server API to put us into the given room
function joinRoom( joinCode ) {
	const requestMethod = joinPrivateRoomForm.attr( "method" ), targetRoute = joinPrivateRoomForm.attr( "action" )

	return httpRequest( requestMethod, `${ targetRoute }/${ joinCode }` ).done( ( roomJoinedPayload ) => {
		if ( roomJoinedPayload.code === joinCode ) {
			window.location.href = "/chat.html"
		} else {
			showErrorModal( "Server sent back mismatching room join code" )
			console.error( `Server API sent back a room code '${ roomJoinedPayload.code }' that does not match the expected code '${ joinCode }'?` )
		}
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when attempting to join room` )
	} )
}

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

	// Request the server API to create the room
	httpRequest( requestMethod, targetRoute, {
		name: roomName,
		isPrivate: isRoomPrivate
	} ).done( ( roomCreatedPayload ) => {
		if ( roomCreatedPayload.name === roomName ) {
			populateRoomsOnPage() // Just in case the below request fails
			joinRoom( roomCreatedPayload.joinCode ) // Join the room we just created
		} else {
			showErrorModal( "Server sent back mismatching room name" )
			console.error( `Server API sent back a room name '${ roomCreatedPayload.name }' that does not match the expected name '${ roomName }'?` )
		}
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when attempting to create room` )
	} ).always( () => setFormLoading( createRoomForm, false ) ) // Always change UI back after the request so the user can try again

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

	// Request the server API to end our session
	httpRequest( "DELETE", "/api/session" ).done( () => {
		showFeedbackModal( "Success", "Your chat session has been ended and all your data has been erased. Close this popup to be redirected to the choose name page.", () => {
			window.location.href = "/"
		} )
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		console.error( `Received HTTP status message '${ httpStatusMessage }' '${ request.responseText }' when trying to end our session` )
	} ).always( () => setButtonLoading( endSessionButton, false ) ) // Return the button to normal

} )

// Try to fetch our name from the server API when the page loads...
$( () => httpRequest( "GET", "/api/name" ).done( ( nameResponsePayload ) => {
	if ( nameResponsePayload.name !== null ) {
		guestName.text( nameResponsePayload.name )

		// Check if we're meant to be in a room
		httpRequest( "GET", "/api/room" ).done( ( roomDataPayload ) => {
			if ( roomDataPayload.room !== null ) {
				showFeedbackModal( "Notice", "You did not properly leave your previous room. Close this popup to be redirected to the chat room page.", () => {
					window.location.href = "/"
				} )
			} else {
				populateRoomsOnPage()
			}
		} ).fail( ( request, _, httpStatusMessage ) => {
			handleServerErrorCode( request.responseText, () => {
				window.location.href = "/" // Redirect back to the chat room page to be safe, as we can't check if we're meant to be in one
			} )
			console.error( `Received HTTP status message '${ httpStatusMessage }' when fetching our room` )
		} )
	} else {
		showFeedbackModal( "Notice", "You have not yet chosen a name yet. Close this popup to be redirected to the choose name page.", () => {
			window.location.href = "/"
		} )
	}
} ).fail( ( request, _, httpStatusMessage ) => {
	handleServerErrorCode( request.responseText, () => {
		window.location.href = "/" // Redirect back to the choose name page to be safe, as we can't check if we have a name
	} )
	console.error( `Received HTTP status message '${ httpStatusMessage }' when fetching our name` )
} ) )
