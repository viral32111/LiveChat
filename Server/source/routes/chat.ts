// Import third-party packages
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"
import { Request } from "express"
import { RawData, WebSocket } from "ws"

// Import code from other scripts
import { expressApp, webSocketServer, multerMiddleware } from "../main"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { ErrorCodes } from "../enumerations/errorCodes"
import { WebSocketPayloadTypes, WebSocketCloseCodes } from "../enumerations/webSocket"
import { forgetClientWebSocket, rememberClientWebSocket, webSocketBroadcastPayload } from "../helpers/webSocketBroadcast"
import { respondToRequest } from "../helpers/requests"
import { WebSocketMessagePayload, WebSocketPayload } from "../interfaces/webSocket"
import { Attachment } from "../interfaces/routes/responses"
import MongoDB from "../classes/mongodb"

// Create the logger for this file
const log = getLogger( "routes/chat" )

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
	if (
		request.headers[ "connection" ]?.toLowerCase() !== "upgrade" ||
		request.headers[ "upgrade" ]?.toLowerCase() !== "websocket"
	) return respondToRequest( response, HTTPStatusCodes.UpgradeRequired, {
		error: ErrorCodes.MustUpgradeToWebSocket
	} )

	// Handle the WebSocket upgrade
	webSocketServer.handleUpgrade( request, request.socket, Buffer.alloc( 0 ), ( webSocketClient ) => {
		log.debug( "Upgraded connection to WebSocket" )
		webSocketServer.emit( "connection", webSocketClient, request, request.session.guestId, request.session.roomId )
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
	const filesPayload: Attachment[] = []
	for ( const file of uploadedFiles ) filesPayload.push( {
		type: file.mimetype,
		path: `/attachments/${ file.filename }`
	} )

	// Send back the list of uploaded files
	respondToRequest( response, HTTPStatusCodes.OK, {
		files: filesPayload
	} )
	log.info( `Guest '${ request.session.guestId }' uploaded ${ uploadedFiles } files.` )

} )

// When a new WebSocket connection is established...
function onWebSocketConnection( client: WebSocket, _: Request, guestId: ObjectId, roomId: ObjectId ) {
	log.info( `New WebSocket connection established for guest '${ guestId }' in room '${ roomId }'.` )

	// Attempt to remember the guest's WebSocket for this room
	try {
		rememberClientWebSocket( guestId, roomId, client )
	} catch ( errorMessage ) {
		log.error( `Failed to delete client WebSocket for guest '${ guestId }' in room '${ roomId }'!` )
	}

	// Register the required event handlers
	client.on( "message", ( message ) => onWebSocketMessage( client, message, guestId, roomId ) )
	client.once( "close", ( code, reason ) => onWebSocketClose( client, code, reason.toString(), guestId, roomId ) )

}

// When a WebSocket connection is closed...
function onWebSocketClose( _: WebSocket, code: number, reason: string, guestId: ObjectId, roomId: ObjectId ) {
	log.info( `WebSocket connection closed for guest '${ guestId }' in room '${ roomId }' (${ code }, '${ reason }').` )

	// Attempt to forget about this guest's WebSocket
	try {
		forgetClientWebSocket( guestId, roomId )
	} catch ( errorMessage ) {
		log.error( `Failed to delete client WebSocket for guest '${ guestId }' in room '${ roomId }'!` )
	}
}

// When a WebSocket message is received...
async function onWebSocketMessage( client: WebSocket, message: RawData, guestId: ObjectId, roomId: ObjectId ) {
	log.debug( `Guest '${ guestId }' in room '${ roomId }' sent WebSocket message: '${ message.toString() }'.` )

	// Attempt to parse the message as JSON
	try {
		const clientPayload: WebSocketPayload = JSON.parse( message.toString() )
		
		// Handle the message based on its type
		if ( clientPayload.type === WebSocketPayloadTypes.Message ) {
			await onGuestMessage( client, clientPayload.data as WebSocketMessagePayload, guestId, roomId )
		} else {
			log.warn( `Unknown WebSocket message type '${ clientPayload.type }'!` )
		}
	} catch ( errorMessage ) {
		log.error( `Failed to parse WebSocket message '${ message.toString() }' as JSON!` )
		client.close( WebSocketCloseCodes.CannotAccept, ErrorCodes.InvalidContentType.toString() )
	}
}

// When a guest sends a message...
async function onGuestMessage( client: WebSocket, payload: WebSocketMessagePayload, guestId: ObjectId, roomId: ObjectId ) {
	log.info( `Guest '${ guestId }' in room '${ roomId }' sent message '${ payload.content }' with attachments '${ payload.attachments }'.`)

	// Attempt to add the message to the database
	try {
		const newMessage = await MongoDB.AddMessage( payload.content, payload.attachments, guestId, roomId )

		// Get the name of the guest who sent the message
		const guests = await MongoDB.GetGuests( { _id: newMessage.sentBy } )
		if ( guests.length <= 0 ) {
			log.error( `Guest '${ guestId }' does not exist?` )
			return client.close( WebSocketCloseCodes.GoingAway, ErrorCodes.NoData.toString() )
		}

		// Broadcast the message to all other guests in the same room
		try {
			await webSocketBroadcastPayload( WebSocketPayloadTypes.Broadcast, {
				content: newMessage.content,
				attachments: newMessage.attachments,
				sentAt: newMessage.sentAt,
				sentBy: guests[ 0 ].name
			} as WebSocketMessagePayload, guestId, roomId )

			log.info( `Broadcasted message '${ newMessage.content }' with attachments '${ newMessage.attachments }' from guest '${ guestId }' to guests in room '${ roomId }'` )
		} catch ( errorMessage ) {
			log.error( `Failed to broadcast message '${ newMessage.content }' with attachments '${ newMessage.attachments }' from guest '${ guestId }' to guests in room '${ roomId }'!` )
			client.close( WebSocketCloseCodes.GoingAway, ErrorCodes.BroadcastFailure.toString() )
		}
	} catch ( errorMessage ) {
		log.error( `Failed to add message '${ payload.content }' from guest '${ guestId }' to database!` )
		client.close( WebSocketCloseCodes.GoingAway, ErrorCodes.DatabaseInsertFailure.toString() )
	}
}

// Register the WebSocket new connection event handler
webSocketServer.on( "connection", onWebSocketConnection )
