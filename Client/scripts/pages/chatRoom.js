"use strict" // Enables strict mode

// Get all the relevant UI elements
const roomName = $( "#roomName" )
const guestName = $( "#guestName" )
const participantCount = $( "#participantCount" )
const roomVisibility = $( "#roomVisibility" )
const joinCode = $( "#joinCode" )
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

// Converts markdown styling in text to HTML tags
const convertMarkdownStylingToHTML = ( markdownText ) =>
	markdownText.replaceAll( markdownBoldPattern, "<strong>$1</strong>" )
		.replaceAll( markdownUnderlinePattern, "<u>$1</u>" )
		.replaceAll( markdownItalicsPattern, "<em>$1</em>" )
		.replaceAll( markdownStrikethroughPattern, "<s>$1</s>" )

// Adds a new message element to the page
function createMessageElement( guestName, content, attachments, sentAt ) {

	// Time
	// TODO: This will need to update every minute or so
	const sentAtParagraph = $( "<p></p>" ).addClass( "float-end m-0" ).text( `${ dateTimeToHumanReadable( sentAt ) }.` )

	// Guest name
	const guestNameStrong = $( "<strong></strong>" ).text( guestName )
	const guestNameHeading = $( "<h5></h5>" ).addClass( "m-0" ).append( guestNameStrong )

	// Content
	const contentParagraph = $( "<p></p>" ).addClass( "m-0" ).html( convertMarkdownStylingToHTML( content ) )

	// Bootstrap column
	const bootstrapColumn = $( "<div></div>" ).addClass( "col" ).append( sentAtParagraph, guestNameHeading, contentParagraph )

	// Attachments, if any
	for ( const attachment of attachments ) {
		if ( attachment.type === "image" ) {
			const attachmentImage = $( "<img></img>" ).addClass( "img-thumbnail mt-2" ).attr( "src", attachment.url ).attr( "alt", "Image attachment" ).attr( "width", "256" ).attr( "height", "256" )
			const attachmentLink = $( "<a></a>" ).attr( "href", attachment.url ).append( attachmentImage )
			bootstrapColumn.append( attachmentLink )
		} else if ( attachment.type === "file" ) {
			const fileAttachmentLink = $( "<a></a>" ).addClass( "ms-2" ).attr( "href", attachment.url ).text( `Download ${ getAttachmentFileName( attachment.url ) }` )
			bootstrapColumn.append( fileAttachmentLink )
		} else {
			console.warn( "Unrecognised attachment:", attachment )
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
}

// Fetches all the data for the current room from the server API...
function fetchRoomData() {
	$.getJSON( "/api/room", ( roomDataPayload ) => {
		if ( roomDataPayload.room !== null ) {

			// Populate room information
			roomName.text( roomDataPayload.room.name )
			participantCount.text( Math.max( 0, roomDataPayload.room.guests.length - 1 ) )
			roomVisibility.text( roomDataPayload.room.isPrivate === true ? "private" : "public" )

			// Populate & show join code, if it was sent
			if ( roomDataPayload.room.joinCode !== null ) {
				joinCode.text( roomDataPayload.room.joinCode )
				joinCode.removeClass( "visually-hidden" )
			}

			// Populate the participants list
			for ( const guest of roomDataPayload.room.guests ) {
				createParticipantElement( guest.name, guest.isRoomCreator )
			}

			// Populate the message history
			for ( const message of roomDataPayload.room.messages ) {
				createMessageElement( message.sentBy, message.content, message.attachments, message.sentAt )
			}

			// TODO: Scroll to the bottom of the chat history

			// Start the WebSocket connection
			WebSocketClient.Initialise( onBroadcastMessage )

		// We aren't in a room, so redirect back to the room list page
		} else {
			showFeedbackModal( "Notice", "You have not joined a room yet. Close this popup to be redirected to the room list page.", () => {
				window.location.href = "/rooms.html"
			} )
		}
	} ).fail( ( request, _, httpStatusMessage ) => {
		handleServerErrorCode( request.responseText )
		throw new Error( `Received HTTP status message '${ httpStatusMessage }' when fetching chat history` )
	} )
}

// When the text in the send message input changes...
sendMessageInput.on( "input", () => {
	// TODO: Save in localStorage so we can restore it if the user refreshes the page? Might not be needed tho as browsers usually do this for you
} )

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

	// Change UI to indicate loading
	sendMessageButton.text( "" )
	setFormLoading( sendMessageForm, true )

	if ( filesToUpload.length > 0 ) {
		const formData = new FormData()

		let counter = 1
		for ( const file of filesToUpload ) {
			console.debug( counter, file.name, file.lastModified, file.size, file.type )
			formData.append( counter.toString(), file, file.name )
			counter++
		}
		console.debug( formData )

		// https://stackoverflow.com/a/5976031
		$.ajax( {
			method: "PUT",
			url: "/api/upload",
			//contentType: "multipart/form-data", // required for file uploads?
			contentType: false,
			cache: false,
			data: formData,
			dataType: "json", // expected data type from server
			processData: false // don't let jQuery convert the data
		}, ( uploadFilesResponse ) => {
			console.debug( uploadFilesResponse )

			WebSocketClient.SendPayload( WebSocketClient.PayloadTypes.Message, {
				content: content,
				attachments: uploadFilesResponse.files
			} )
		} ).fail( ( request, _, httpStatusMessage ) => {
			handleServerErrorCode( request.responseText )
			throw new Error( `Received HTTP status message '${ httpStatusMessage }' when uploading message attachments` )
		} )
	} else {
		WebSocketClient.SendPayload( WebSocketClient.PayloadTypes.Message, {
			content: content,
			attachments: []
		} )
	}

	// Change UI back to normal
	sendMessageButton.text( "Send" )
	setFormLoading( sendMessageForm, false )

	// Clear all the inputs
	sendMessageForm[ 0 ].reset()

	// Refocus the send message input
	sendMessageInput.focus()

} )

// Submit the form if the enter key is pressed in the send message input
sendMessageInput.on( "keydown", ( event ) => {
	if ( event.key === "Enter" ) sendMessageForm.submit()
} )

// When the leave room button is pressed...
leaveRoomButton.on( "click", () => {
	console.debug( "leave room" )
	// TODO: API request to leave the room, then redirect back to room list
} )

// When the page loads...
$( () => {

	// Focus on the send message input so the user can start typing straight away
	sendMessageInput.focus()

	// Try to fetch our name from the Server API, then populate the room information
	$.getJSON( "/api/name", ( responsePayload ) => {
		if ( responsePayload.name !== null ) {
			guestName.text( responsePayload.name )
			fetchRoomData()
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
	} )

} )
