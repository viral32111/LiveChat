// Import third-party packages
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"
import { WebSocket } from "ws"

// Import code from other scripts
import { WebSocketPayloadTypes } from "../enumerations/webSocket"
import { WebSocketGuestUpdatePayload, WebSocketMessagePayload } from "../interfaces/webSocket"

// Create the logger for this file
const log = getLogger( "helpers/webSocketBroadcast" )

// Map to hold WebSocket clients by room ID
export const webSocketClients = new Map<string, Map<string, WebSocket>>()

// Adds a client WebSocket to the map
export function rememberClientWebSocket( guestId: ObjectId, roomId: ObjectId, webSocket: WebSocket ) {
	
	// Create the room & add guest WebSocket directly if it doesn't exist
	const roomClients = webSocketClients.get( roomId.toString() )
	if ( roomClients === undefined ) {
		webSocketClients.set( roomId.toString(), new Map( [
			[ guestId.toString(), webSocket ]
		] ) )

	// Otherwise, add the guest WebSocket to the room
	} else {
		roomClients.set( guestId.toString(), webSocket )
	}
}

// Removes a client WebSocket from the map
export function forgetClientWebSocket( guestId: ObjectId, roomId: ObjectId ) {

	// Fail if the room or guest doesn't exist in the WebSocket clients map
	const roomClients = webSocketClients.get( roomId.toString() )
	if ( roomClients === undefined ) throw new Error( `Room '${ roomId }' does not exist in WebSocket clients map?` )
	if ( roomClients.has( guestId.toString() ) === false ) throw new Error( `Guest '${ guestId }' does not exist in room '${ roomId }' in WebSocket clients map?` )

	roomClients.delete( guestId.toString() )

}

// Broadcasts a payload to all other guests in the same room
export async function webSocketBroadcastPayload( type: WebSocketPayloadTypes, data: WebSocketMessagePayload | WebSocketGuestUpdatePayload, _: ObjectId, roomId: ObjectId ) {

	// Fail if the room or guest doesn't exist in the WebSocket clients map
	const roomClients = webSocketClients.get( roomId.toString() )
	if ( roomClients === undefined ) throw new Error( `Room '${ roomId }' does not exist in WebSocket clients map?` )
	//if ( roomClients.has( guestId.toString() ) === false ) throw new Error( `Guest '${ roomId }' does not exist in room '${ roomId }' in WebSocket clients map?` )

	// Send the payload to all other guests in this room
	for ( const [ guestId, wsClient ] of roomClients.entries() ) {

		// Skip if the WebSocket is not open
		if ( wsClient.readyState !== WebSocket.OPEN ) {
			log.warn( `Skipped forwarding WebSocket payload type ${ type } with data '${ JSON.stringify( data ) }' to guest '${ guestId }' in room '${ roomId } as WebSocket readyState is not open!'` )
			continue
		}

		wsClient.send( JSON.stringify( {
			type: type,
			data: data
		} ) )

		log.debug( `Forwarded WebSocket payload type ${ type } with data '${ JSON.stringify( data ) }' to guest '${ guestId }' in room '${ roomId }'` )
	}

}
