// Import required third-party packages
import { getLogger } from "log4js"

// Import required code from other scripts
import { expressApp, webSocketServer } from "../main"
import { multerMiddleware } from "../express"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { ErrorCodes } from "../enumerations/errorCodes"
import { WebSocketPayloadTypes, WebSocketCloseCodes } from "../enumerations/webSocket"
import { respondToRequest } from "../helpers/requests"

// Create the logger for this file
const log = getLogger( "routes/chat" )

// Structure for upload files response
interface FilePayload {
	type: string,
	path: string
}

// Create a route for upgrading to a WebSocket connection
expressApp.get( "/api/chat", ( request, response ) => {

	// Fail if the guest has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// Fail if the guest has not joined a room yet
	if ( request.session.roomId === undefined ) return respondToRequest( response, HTTPStatusCodes.Forbidden, {
		error: ErrorCodes.RoomNotJoined
	} )

	// Fail if this is not a WebSocket upgrade attempt
	if ( request.headers[ "upgrade" ] === undefined || request.headers[ "upgrade" ].toLowerCase() !== "websocket" ) return respondToRequest( response, HTTPStatusCodes.UpgradeRequired, {
		error: ErrorCodes.MustUpgradeToWebSocket
	} )

	// Handle the WebSocket upgrade
	webSocketServer.handleUpgrade( request, request.socket, Buffer.alloc( 0 ), ( webSocketClient ) => {
		log.debug( "Upgraded connection to WebSocket" )
		webSocketServer.emit( "connection", webSocketClient, request )
	} )

} )

// Route for uploading files to use as message attachments
expressApp.put( "/api/upload", multerMiddleware.any(), ( request, response ) => {

	// Fail if the guest has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// Fail if the guest has not joined a room yet
	if ( request.session.roomId === undefined ) return respondToRequest( response, HTTPStatusCodes.Forbidden, {
		error: ErrorCodes.RoomNotJoined
	} )

	// Fail if the request payload is not form data
	if ( request.is( "multipart/form-data" ) === false ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.InvalidContentType
	} )

	// Fail if no files were uploaded
	if ( request.files === undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.NoFilesUploaded
	} )

	// Cast because TypeScript doesn't know how to do this automatically
	const uploadedFiles = request.files as Express.Multer.File[]

	// Loop through the uploaded files & add their type and URL to a payload for the response
	const filesPayload: FilePayload[] = []
	for ( const file of uploadedFiles ) filesPayload.push( {
		type: file.mimetype,
		path: `/attachments/${ file.filename }`
	} )

	// Send back the list of uploaded files
	respondToRequest( response, HTTPStatusCodes.OK, {
		files: filesPayload
	} )
	log.info( `Guest '${ request.session.guestId }' uploaded ${ uploadedFiles.length } files.` )

} )

// When a new WebSocket connection is established...
webSocketServer.on( "connection", ( webSocketClient ) => {

	// Acknowledge the connection
	log.debug( "New connection" )
	webSocketClient.send( JSON.stringify( {
		type: WebSocketPayloadTypes.Acknowledgement,
		data: {}
	} ) )

	// When a message is received from this client...
	webSocketClient.on( "message", ( message ) => {
		log.debug( "Client sent", message.toString() )

		// Attempt to parse the message as JSON
		try {
			const clientPayload = JSON.parse( message.toString() )
			console.dir( clientPayload )

			// Acknowledge the message
			webSocketClient.send( JSON.stringify( {
				type: WebSocketPayloadTypes.Acknowledgement,
				data: {}
			} ) )
		
		// Disconnect the client if the message is not JSON
		} catch ( errorMessage ) {
			log.error( `Failed to parse WebSocket message '${ message.toString() }' as JSON!` )
			return webSocketClient.close( WebSocketCloseCodes.CannotAccept, "Invalid JSON" )
		}
	} )

} )
