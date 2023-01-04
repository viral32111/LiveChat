// Import required third-party packages
import { getLogger } from "log4js"

// Import required code from other scripts
import { expressApp } from "../main"
import { HTTPStatusCodes } from "../httpStatusCodes"
import { respondToRequest } from "../helpers/requests"
import { ErrorCodes } from "../errorCodes"
import MongoDB from "../mongodb"

// Create the logger for this file
const log = getLogger( "routes/room" )

// Structure of the public room data
interface PublicRoom {
	name: string,
	participantCount: number,
	latestMessageSentAt: number | null // Unix timestamp
}

// Route to list all public rooms
expressApp.get( "/api/rooms", async ( request, response ) => {

	// Fail if the user has not chosen a name yet
	if ( request.session.chosenName === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// Will hold the list of public rooms to return
	const publicRoomsList: PublicRoom[] = []

	// Fetch all public rooms
	const publicRooms = await MongoDB.GetRooms( false )
	log.debug( `Fetched ${ publicRooms.length } public rooms.` )

	// Loop through those public rooms...
	for ( const publicRoom of publicRooms ) {

		// Fetch all the messages in this room
		const roomMessages = await MongoDB.GetMessages( publicRoom._id )
		log.debug( `Fetched ${ roomMessages.length } messages for room '${ publicRoom._id }'.` )

		// Add this room to the list, with the time the latest message was sent
		publicRoomsList.push( {
			name: publicRoom.name,
			participantCount: publicRoom.participantCount,
			latestMessageSentAt: roomMessages.length > 0 ? new Date( roomMessages[ 0 ].sentAt ).getTime() / 1000 : null
		} )
	}

	// Sort rooms by the number of participants from highest to lowest
	publicRoomsList.sort( ( publicRoomA, publicRoomB ) => publicRoomB.participantCount - publicRoomA.participantCount )

	// Send back the list of public rooms
	respondToRequest( response, HTTPStatusCodes.OK, {
		publicRooms: publicRoomsList
	} )

} )

expressApp.get( "/api/room", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )
expressApp.post( "/api/room", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )

expressApp.delete( "/api/session", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )
