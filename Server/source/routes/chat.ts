// Import required third-party packages
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"

// Import required code from other scripts
import { expressApp, webSocketServer } from "../main"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { respondToRequest } from "../helpers/requests"
import { ErrorCodes } from "../enumerations/errorCodes"
import MongoDB from "../mongodb"

// Create the logger for this file
const log = getLogger( "routes/chat" )

// Interfaces for the payload returned by the get current room route
interface GuestPayload {
	name: string,
	isRoomCreator: boolean
}
interface MessagePayload {
	content: string,
	attachments: string[],
	sentAt: Date,
	sentBy: ObjectId
}
interface RoomPayload {
	name: string,
	isPrivate: boolean,
	joinCode: string | null,
	guests: GuestPayload[],
	messages: MessagePayload[]
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

webSocketServer.on( "connection", ( webSocketClient ) => {
	log.debug( "New connection" )
	webSocketClient.send( "Hello World" )

	webSocketClient.on( "message", ( message ) => {
		log.debug( "New message:", message, "from client" )
		webSocketClient.send( message )
	} )
} )

// Route for fetching data for the current room
expressApp.get( "/api/room", async ( request, response ) => {

	// Fail if the guest has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// No room if the guest has not joined a room yet
	if ( request.session.roomId === undefined ) return respondToRequest( response, HTTPStatusCodes.OK, {
		room: null
	} )

	// Attempt to fetch the room from the database
	try {
		const rooms = await MongoDB.GetRooms( {
			_id: new ObjectId( request.session.roomId )
		} )

		// Fail if the room somehow wasn't found?
		if ( rooms.length <= 0 ) return respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseFindFailure
		} )

		// Create the initial payload for the room data
		const roomPayload: RoomPayload = {
			name: rooms[ 0 ].name,
			isPrivate: rooms[ 0 ].isPrivate,
			joinCode: request.session.guestId === rooms[ 0 ].createdBy ? rooms[ 0 ].joinCode : null, // Only if this guest is the room creator
			guests: [],
			messages: []
		}

		// Add all the messages in this room
		const messages = await MongoDB.GetMessages( { roomId: rooms[ 0 ]._id } )
		for ( const message of messages ) roomPayload.messages.push( {
			content: message.content,
			attachments: message.attachments,
			sentAt: message.sentAt,
			sentBy: message.sentBy
		} )

		// Add all the guests in this room
		const guests = await MongoDB.GetGuests( { inRoom: rooms[ 0 ]._id } )
		for ( const guest of guests ) roomPayload.guests.push( {
			name: guest.name,
			isRoomCreator: guest._id === rooms[ 0 ].createdBy
		} )

		// Send back the completed payload
		respondToRequest( response, HTTPStatusCodes.OK, { room: roomPayload } )
	} catch ( errorMessage ) {
		log.error( `Error while finding room '${ request.session.roomId }' in the database (${ errorMessage })!` )
		return respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseFindFailure
		} )
	}

} )

// TODO: Route for uploading files
expressApp.put( "/api/upload", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )

