// Import required third-party packages
import { getLogger } from "log4js"
import { Server } from "ws"

// Import required code from other scripts
import { expressApp } from "../main"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { respondToRequest } from "../helpers/requests"
import { ErrorCodes } from "../enumerations/errorCodes"

// Create the logger for this file
const log = getLogger( "routes/chat" )

// Create a WebSocket server without a HTTP server, as we will handle the upgrade ourselves
export const webSocketServer = new Server( {
	noServer: true
} )

// Create a route for upgrading to a WebSocket connection
expressApp.get( "/api/chat", ( request, response ) => {
		
	// Fail if the user has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
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

// TODO: Route for uploading files
expressApp.put( "/api/upload", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )

// TODO: Route for fetching chat history for a room
expressApp.get( "/api/history", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )
