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

// Regular expressions for finding markdown styling
const markdownBoldPattern = new RegExp( /\*\*(.*)\*\*/g )
const markdownUnderlinePattern = new RegExp( /__(.*)__/g )
const markdownItalicsPattern = new RegExp( /\*(.*)\*/g )
const markdownStrikethroughPattern = new RegExp( /~~(.*)~~/g )

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
	const sentAtParagraph = $( "<p></p>" ).addClass( "float-end m-0" ).text( `${ unixTimestampToHumanReadable( sentAt ) }.` )

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
			console.error( "Unrecognised attachment:", attachment )
		}
	}

	// Bootstrap row
	const bootstrapRow = $( "<div></div>" ).addClass( "row" ).append( bootstrapColumn )

	// Prepend horizontal rule if this isn't the first message
	if ( chatMessages.children().length >= 1 ) chatMessages.append( $( "<hr>" ) )

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

// When the text in the send message input changes...
sendMessageInput.on( "input", () => {
	// TODO: Save in localStorage so we can restore it if the user refreshes the page? Might not be needed tho as browsers usually do this for you
} )

// When the send message form is submitted...
sendMessageForm.on( "submit", ( event ) => {
	event.preventDefault()
	event.stopPropagation()

	const messageContent = sendMessageInput.val()
	const messageAttachments = sendMessageFiles.prop( "files" )
	console.debug( "send message", messageContent, messageAttachments )
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

	// Try to fetch our name from the Server API
	$.getJSON( "/api/name", ( responsePayload ) => {
		if ( responsePayload.name !== null ) {
			sendMessageInput.focus()
			// TODO: Fetch chat history for this room, redirect back to room list if we aren't in a room
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

	// DEBUGGING
	createMessageElement( "JohnDoe1", "Hello World!", [], ( new Date().getTime() / 1000 ) - 60 * 31 )
	createMessageElement( "JohnDoe2", "This is a message that contains styling such as **bold**, __underline__, *italics* and ~~strikethrough~~.", [], ( new Date().getTime() / 1000 ) - 60 * 30 )
	createMessageElement( "JohnDoe3", "This message contains an image attachment, which is shown as a preview.", [ {
		type: "image",
		url: "https://via.placeholder.com/256"
	} ], ( new Date().getTime() / 1000 ) - 60 * 27 )
	createMessageElement( "JohnDoe4", "This message contains a regular file attachment, which is shown as a link.", [ {
		type: "file",
		url: "/attachments/document.txt"
	} ], ( new Date().getTime() / 1000 ) - 60 * 10 )

	createParticipantElement( "JohnDoe1", false )
	createParticipantElement( "JohnDoe2", false )
	createParticipantElement( "JohnDoe3", false )
	createParticipantElement( "JohnDoe4", false )
	createParticipantElement( "JohnDoe5", true )
	createParticipantElement( "JohnDoe6", false )
	createParticipantElement( "JohnDoe7", false )

	roomName.text( "Example Room" )
	guestName.text( "JohnDoe2" )
	participantCount.text( "6" )
	roomVisibility.text( "public" )
	joinCode.text( "AABBCC" )

} )
