"use strict" // Enables strict mode

// Get all the relevant UI elements
const roomName = $( "#roomName" )
const guestName = $( "#guestName" )
const participantCount = $( "#participantCount" )
const roomVisibility = $( "#roomVisibility" )
const joinCode = $( "#joinCode" )
const joinCodeMessage = $( "#joinCodeMessage" )
const chatMessages = $( "#chatMessages" )
const participantsList = $( "#participantsList" )
const sendMessageForm = $( "#sendMessageForm" )
const sendMessageInput = $( "#sendMessageInput" )
const sendMessageFiles = $( "#sendMessageFiles" )
const sendMessageButton = $( "#sendMessageButton" )
const leaveRoomButton = $( "#leaveRoomButton" )
const noMessagesNotice = $( "#noMessagesNotice" )

// Regular expressions for finding markdown styling
const markdownBoldPattern = new RegExp( /\*\*(.*)\*\*/g )
const markdownUnderlinePattern = new RegExp( /__(.*)__/g )
const markdownItalicsPattern = new RegExp( /\*(.*)\*/g )
const markdownStrikethroughPattern = new RegExp( /~~(.*)~~/g )

// Regular expressions for validating chat messages
const chatMessageValidationPattern = new RegExp( /^.{1,200}$/ )

// Helper function to get the file name from the end of a path
const getAttachmentFileName = ( path ) => path.split( "/" ).pop()

// Global variable to check if we have been granted permission to send notifications
let hasNotificationPermission = Notification.permission === "granted"

// Converts markdown styling in text to HTML tags
const convertMarkdownStylingToHTML = ( markdownText ) =>
	markdownText.replaceAll( markdownBoldPattern, "<strong>$1</strong>" )
		.replaceAll( markdownUnderlinePattern, "<u>$1</u>" )
		.replaceAll( markdownItalicsPattern, "<em>$1</em>" )
		.replaceAll( markdownStrikethroughPattern, "<s>$1</s>" )

// Adds a new message element to the page
function createMessageElement( guestName, content, attachments, sentAt ) {

	// Time
	const sentAtParagraph = $( "<p></p>" ).addClass( "float-end m-0" ).attr( "data-sent-at", sentAt ).text( `${ dateTimeToHumanReadable( sentAt ) }.` )

	// Guest name
	let guestNameHeading
	if ( guestName !== null ) {
		const guestNameStrong = $( "<strong></strong>" ).text( guestName )
		guestNameHeading = $( "<h5></h5>" ).addClass( "m-0" ).append( guestNameStrong )
	} else {
		const guestNameItalic = $( "<em></em>" ).text( "Unknown Guest" )
		guestNameHeading = $( "<h5></h5>" ).addClass( "m-0 text-secondary" ).append( guestNameItalic )
	}

	// Content
	const contentParagraph = $( "<p></p>" ).addClass( "m-0" ).html( convertMarkdownStylingToHTML( content ) )

	// Bootstrap column
	const bootstrapColumn = $( "<div></div>" ).addClass( "col" ).append( sentAtParagraph, guestNameHeading, contentParagraph )

	// Attachments, if any
	for ( const attachment of attachments ) {
		const attachmentFileName = getAttachmentFileName( attachment.path )

		if ( attachment.type.startsWith( "image/" ) ) {
			const attachmentImage = $( "<img></img>" ).addClass( "img-thumbnail d-block mt-2" ).attr( "src", attachment.path ).attr( "alt", "Image attachment" ).attr( "width", "256" ).attr( "height", "256" )
			const attachmentLink = $( "<a></a>" ).attr( "href", attachment.path ).append( attachmentImage )
			bootstrapColumn.append( attachmentLink )
		} else {
			const fileAttachmentLink = $( "<a></a>" ).addClass( "ms-2" ).attr( "href", attachment.path ).attr( "download", attachmentFileName ).text( `Download ${ attachmentFileName }` )
			bootstrapColumn.append( fileAttachmentLink )
		}
	}

	// Bootstrap row
	const bootstrapRow = $( "<div></div>" ).addClass( "row" ).append( bootstrapColumn )

	// Hide the no messages notice if this is the first message
	if ( chatMessages.children().length === 1 ) noMessagesNotice.addClass( "visually-hidden" )

	// Prepend horizontal rule if this isn't the first message
	if ( chatMessages.children().length >= 2 ) chatMessages.append( $( "<hr>" ) )

	// Display message on page
	chatMessages.append( bootstrapRow )

	// Scroll to the bottom of the chat history - https://stackoverflow.com/a/2664878
	chatMessages.scrollTop( chatMessages[ 0 ].scrollHeight )

}

// Adds a new participant element to the page
function createParticipantElement( name, isRoomCreator ) {

	// Name
	const nameParagraph = $( "<p></p>" ).addClass( "m-0" ).text( name )

	// Make the room creator's name blue
	if ( isRoomCreator === true ) nameParagraph.addClass( "text-success" )

	// Bootstrap column & row
	const bootstrapColumn = $( "<div></div>" ).addClass( "col" ).append( nameParagraph )
	const bootstrapRow = $( "<div></div>" ).addClass( "row" ).append( bootstrapColumn )

	// Display participant on page
	participantsList.append( bootstrapRow )

}

// Creates a new message element whenever one is received from the WebSocket
function onBroadcastMessage( payload ) {
	createMessageElement( payload.sentBy, payload.content, payload.attachments, payload.sentAt )

	// Send a notification if the user isn't focused on the tab & they have granted the permission
	if ( document.hasFocus() === false && hasNotificationPermission === true ) new Notification( payload.sentBy, {
		body: payload.content,
	} )

}

// Repopulates the participants list whenever a new participant list is received from the WebSocket
function onGuestsUpdate( payload ) {
	participantCount.text( payload.guests.length - 1 )
	participantsList.empty()
	for ( const guest of payload.guests ) createParticipantElement( guest.name, guest.isRoomCreator )
}

// Fetches all the data for the current room from the server API...
function fetchRoomData() {
	httpRequest( "GET", "/api/room" ).done( ( roomDataPayload ) => {
		if ( roomDataPayload.room !== null ) {

			// Populate room information
			roomName.text( roomDataPayload.room.name )
			participantCount.text( Math.max( 0, roomDataPayload.room.guests.length - 1 ) )
			roomVisibility.text( roomDataPayload.room.isPrivate === true ? "private" : "public" )

			// Populate & show join code, if it was sent
			if ( roomDataPayload.room.joinCode !== null ) {
				joinCode.text( roomDataPayload.room.joinCode )
				joinCodeMessage.removeClass( "visually-hidden" )
			}

			// Populate the participants list
			for ( const guest of roomDataPayload.room.guests ) {
				createParticipantElement( guest.name, guest.isRoomCreator )
			}

			// Populate the message history
			for ( const message of roomDataPayload.room.messages ) {
				createMessageElement( message.sentBy, message.content, message.attachments, message.sentAt )
			}

			// Start the WebSocket connection
			WebSocketClient.Initialise( onBroadcastMessage, onGuestsUpdate )

		// We aren't in a room, so redirect back to the room list page
		} else {
			showFeedbackModal( "Notice", "You have not joined a room yet. Close this popup to be redirected to the room list page.", () => {
				window.location.href = "/rooms.html"
			} )
		}
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		console.error( `Received HTTP status message '${ httpStatusMessage }' when fetching chat history` )
	} )
}

// Updates the text of all the message sent at elements
function updateMessagesSentAt() {

	// Get all paragraph tags with the data-sent-at attribute
	const messageSentAtParagraphs = $( "p[ data-sent-at ]" )

	// Update the text of each paragraph tag
	messageSentAtParagraphs.each( ( _, sentAtParagraph ) => {
		const messageSentAtParagraph = $( sentAtParagraph )
		const messageSentAt = messageSentAtParagraph.attr( "data-sent-at" )

		messageSentAtParagraph.text( dateTimeToHumanReadable( messageSentAt ).concat( "." ) )
	} )

}

// When the send message form is submitted...
sendMessageForm.on( "submit", ( event ) => {

	// Stop the default form redirect from happening
	event.preventDefault()
	event.stopPropagation()

	// Get the message & files from the inputs
	const content = sendMessageInput.val()
	const filesToUpload = sendMessageFiles.prop( "files" )

	// Fail if the manual input validation fails
	if ( chatMessageValidationPattern.test( content ) !== true ) return showFeedbackModal( "Notice", "The chat message you have entered is invalid." )

	// Disable inputs while we're sending the message
	setFormLoading( sendMessageForm, true )

	// If there are files to upload, upload them before sending the message
	if ( filesToUpload.length > 0 ) {
		const formData = new FormData()
		for ( let fieldName = 1; fieldName <= filesToUpload.length; fieldName++ ) {
			formData.append( fieldName.toString(), filesToUpload[ fieldName - 1 ] )
		}

		// Using $.ajax instead of httpRequest() helper here because we need to use FormData
		$.ajax( {
			method: "PUT",
			url: "/api/upload",
			data: formData,
			dataType: "json", // Expected response type

			// https://stackoverflow.com/a/5976031
			contentType: false, // Prevents jQuery from setting the Content-Type header, as it removes the multipart/form-data boundary
			processData: false, // Prevent jQuery from modifying the data before sending it

			// Server sends back the paths of our files, so we just send those references back along with the content
			success: ( uploadFilesResponse ) => WebSocketClient.SendPayload( WebSocketClient.PayloadTypes.Message, {
				content: content,
				attachments: uploadFilesResponse.files
			} ),
			error: ( request, _, httpStatusMessage ) => {
				handleServerErrorCode( request.responseText )
				console.error( `Received HTTP status message '${ httpStatusMessage }' when uploading message attachments` )
			}
		} )

	// Otherwise, just send the message without any attachments
	} else {
		WebSocketClient.SendPayload( WebSocketClient.PayloadTypes.Message, {
			content: content,
			attachments: []
		} )
	}

	// Reset the form
	setFormLoading( sendMessageForm, false )
	sendMessageForm[ 0 ].reset()

	// Refocus the send message input
	sendMessageInput.focus()

} )

// When the leave room button is pressed...
leaveRoomButton.on( "click", () => {

	// Make the button appear to be loading
	setButtonLoading( leaveRoomButton, true )

	// Request the server API to make us leave our current room
	httpRequest( "DELETE", "/api/room" ).done( () => {
		WebSocketClient.Close() // Close the WebSocket connection
		showFeedbackModal( "Success", "You have left this room. If you were the last to leave, then the room has also been deleted. Close this popup to be redirected to the room list page.", () => {
			window.location.href = "/rooms.html"
		} )
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		console.error( `Received HTTP status message '${ httpStatusMessage }' '${ request.responseText }' when trying to leave the room` )
	} ).always( () => setButtonLoading( leaveRoomButton, false ) ) // Return the button to normal

} )

// When the page loads...
$( () => {

	// Focus on the send message input so the user can start typing straight away
	sendMessageInput.focus()

	// Try to fetch our name from the Server API, then populate the room information
	httpRequest( "GET", "/api/name" ).done( ( responsePayload ) => {
		if ( responsePayload.name !== null ) {
			guestName.text( responsePayload.name )
			fetchRoomData()
			setInterval( updateMessagesSentAt, 1000 ) // Update the sent at text of messages every second
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
	} )

	// Ask for permission to send notifications, if we haven't got it aleady
	if ( hasNotificationPermission === false ) showFeedbackModal(
		"Permissions Request",
		"This website needs permission to send you notifications. Close this popup to be prompted to either accept or deny this permission request.",
		() => Notification.requestPermission().then( ( permissionStatus ) => {
			if ( permissionStatus === "granted" ) {
				hasNotificationPermission = true
			} else {
				showFeedbackModal( "Notice", "You have denied permission for this website to send notifications, so you will not see notifications for chat messages. You can change this in your browser settings." )
			}
		} ) )

} )
