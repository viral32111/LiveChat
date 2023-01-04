// Import required third-party packages
import { getLogger } from "log4js"

// Import required code from other scripts
import { expressApp } from "../main"
import { HTTPStatusCodes } from "../httpStatusCodes"
import { respondToRequest } from "../helpers/requests"
import { validateRoomName } from "../helpers/validation"
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

// Structure of the create room payload
interface CreateRoomPayload {
	name: string,
	isPrivate: boolean
}

// Route to list all public rooms
expressApp.get( "/api/rooms", async ( request, response ) => {

	// Fail if the user has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// Will hold the list of public rooms to return
	const publicRoomsList: PublicRoom[] = []

	// Fetch all public rooms
	const publicRooms = await MongoDB.GetRooms( false )

	// Loop through those public rooms...
	for ( const publicRoom of publicRooms ) {

		// Fetch all the messages in this room
		const roomMessages = await MongoDB.GetMessages( publicRoom._id )

		// Add this room to the list, with the time the latest message was sent
		publicRoomsList.push( {
			name: publicRoom.name,
			participantCount: publicRoom.participantCount,
			latestMessageSentAt: roomMessages.length > 0 ? new Date( roomMessages[ 0 ].sentAt ).getTime() / 1000 : null
		} )
	}

	// Sort rooms by the number of participants from highest to lowest
	publicRoomsList.sort( ( publicRoomA, publicRoomB ) => publicRoomB.participantCount - publicRoomA.participantCount )

	// Display the number of rooms in the console
	log.info( `Listing ${ publicRoomsList.length } public rooms for guest '${ request.session.guestId }'.` )

	// Send back the list of public rooms
	respondToRequest( response, HTTPStatusCodes.OK, {
		publicRooms: publicRoomsList
	} )

} )

// Route to create a new room
expressApp.put( "/api/room", async ( request, response ) => {

	// Fail if the user has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// Fail if the request payload is not JSON, or there is no request payload
	if ( request.is( "application/json" ) === false ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.InvalidContentType } )
	if ( request.body.length <= 0 ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.MissingPayload } )

	// Cast the request body to the expected JSON structure
	const createRoomPayload: CreateRoomPayload = request.body

	// Fail if any properties are missing or invalid
	if ( createRoomPayload.name === undefined || createRoomPayload.isPrivate === undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.PayloadMissingProperty } )
	if ( validateRoomName( createRoomPayload.name ) !== true ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.PayloadMalformedValue } )

	// Try to create a new room in the database
	try {
		const newRoom = await MongoDB.CreateRoom( createRoomPayload.name, createRoomPayload.isPrivate )
		log.info( `Created new ${ createRoomPayload.isPrivate === true ? "private" : "public" } room '${ createRoomPayload.name }' (${ newRoom.insertedId }) for guest '${ request.session.guestId }'.` )
	} catch ( errorMessage ) {
		log.error( `Failed to insert new room '${ createRoomPayload.name }' into the database (${ errorMessage })!` )
		return respondToRequest( response, HTTPStatusCodes.InternalServerError, { error: ErrorCodes.DatabaseInsertFailure } )
	}

	// Send back the room name as confirmation
	respondToRequest( response, HTTPStatusCodes.OK, {
		name: createRoomPayload.name
	} )

} )

expressApp.get( "/api/room", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )

// Route to end the current session
expressApp.delete( "/api/session", ( request, response ) => {

	// Fail if the user has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// Store the guest ID in a variable, so we can use it after the session is destroyed
	const guestId = request.session.guestId

	// Try to end the current Express session...
	request.session.destroy( async ( errorMessage ) => {

		// If all was good...
		if ( errorMessage === undefined ) {

			// Try to delete the guest from the databasae
			try {
				await MongoDB.RemoveGuest( guestId )
			} catch ( mongoErrorMessage ) {
				log.error( `Failed to delete guest '${ guestId }' from the database (${ errorMessage })!` )
				respondToRequest( response, HTTPStatusCodes.InternalServerError, {
					error: ErrorCodes.DatabaseDeleteFailure
				} )
			}

			// TODO: Remove messages sent by this guest?

			// Send back a success response
			respondToRequest( response, HTTPStatusCodes.OK, {} )
			log.info( `Ended session for guest '${ guestId }'.` )

		// Otherwise, send back an failure response
		} else {
			log.error( `Error while destroying Express session: '${ errorMessage }!` )
			respondToRequest( response, HTTPStatusCodes.InternalServerError, {
				error: ErrorCodes.ExpressSessionDestroyFailure
			} )
		}

	} )

} )
