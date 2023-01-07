// Import required third-party packages
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"

// Import required code from other scripts
import { expressApp } from "../main"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { ErrorCodes } from "../enumerations/errorCodes"
import { respondToRequest } from "../helpers/requests"
import { validateRoomJoinCode, validateRoomName } from "../helpers/validation"
import MongoDB from "../mongodb"
import { Attachment } from "./chat"

// Create the logger for this file
const log = getLogger( "routes/room" )

// Structure of the get public rooms API route response
interface PublicRoomPayload {
	name: string,
	guestCount: number,
	latestMessageSentAt: Date | null, 
	joinCode: string
}

// Structure of the create room API route request
interface CreateRoomPayload {
	name: string,
	isPrivate: boolean
}

// Structure of the get current room API route response
interface GuestPayload {
	name: string,
	isRoomCreator: boolean
}
interface MessagePayload {
	content: string,
	attachments: Attachment[],
	sentAt: Date,
	sentBy: string
}
interface RoomPayload {
	name: string,
	isPrivate: boolean,
	joinCode: string | null,
	guests: GuestPayload[],
	messages: MessagePayload[]
}

// Route to list all public rooms
expressApp.get( "/api/rooms", async ( request, response ) => {

	// Fail if the user has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// Will hold the list of public rooms to return
	const publicRoomsList: PublicRoomPayload[] = []

	// Attempt to fetch all public rooms
	try {
		const publicRooms = await MongoDB.GetRooms( {
			isPrivate: false
		} )

		// Loop through those public rooms...
		for ( const publicRoom of publicRooms ) {

			// Fetch all the messages in this room
			const roomMessages = await MongoDB.GetMessages( {
				roomId: publicRoom._id
			} )

			// Fetch all the guests in this room
			const roomGuests = await MongoDB.GetGuests( {
				inRoom: publicRoom._id
			} )

			// Add this room to the list, with the time the latest message was sent
			publicRoomsList.push( {
				name: publicRoom.name,
				guestCount: roomGuests.length,
				latestMessageSentAt: roomMessages.length > 0 ? new Date( roomMessages[ roomMessages.length - 1 ].sentAt ) : null,
				joinCode: publicRoom.joinCode
			} )

		}

		// Sort rooms by the number of participants from highest to lowest
		publicRoomsList.sort( ( publicRoomA, publicRoomB ) => publicRoomB.guestCount - publicRoomA.guestCount )

		// Send back the list of public rooms
		respondToRequest( response, HTTPStatusCodes.OK, {
			publicRooms: publicRoomsList
		} )
		log.info( `Listing ${ publicRoomsList.length } public rooms for guest '${ request.session.guestId }'.` )
	} catch ( errorMessage ) {
		log.error( `Failed to find public rooms in the database (${ errorMessage })!` )
		respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseInsertFailure
		} )
	}

} )

// Route to create a new room
expressApp.post( "/api/room", async ( request, response ) => {

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
		const roomInsert = await MongoDB.AddRoom( createRoomPayload.name, createRoomPayload.isPrivate, request.session.guestId )

		// Get the new room from the database
		const newRooms = await MongoDB.GetRooms( { _id: roomInsert.insertedId } )
		if ( newRooms.length <= 0 ) throw new Error( "Room somehow not found in database right after insert?" )

		// Send back the room data as confirmation
		respondToRequest( response, HTTPStatusCodes.OK, {
			name: newRooms[ 0 ].name,
			isPrivate: newRooms[ 0 ].isPrivate,
			joinCode: newRooms[ 0 ].joinCode
		} )
		log.info( `Created new ${ createRoomPayload.isPrivate === true ? "private" : "public" } room '${ createRoomPayload.name }' (${ roomInsert.insertedId }) for guest '${ request.session.guestId }'.` )
	} catch ( errorMessage ) {
		log.error( `Failed to create new room '${ createRoomPayload.name }' for guest '${ request.session.guestId}' (${ errorMessage })!` )
		respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseOperationFailure
		} )
	}

} )

// Route to join a room
expressApp.get( "/api/room/:code", async ( request, response ) => {

	// Fail if the user has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// Fail if the join code property is missing or invalid
	if ( request.params.code === undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.PayloadMissingProperty } )
	if ( validateRoomJoinCode( request.params.code ) !== true ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.PayloadMalformedValue } )

	// Attempt to fetch the room with the provided join code from the database
	try {
		const rooms = await MongoDB.GetRooms( {
			joinCode: request.params.code
		} )

		// Fail if the room somehow wasn't found?
		if ( rooms.length <= 0 ) return respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseFindFailure
		} )

		// Update the guest's room ID in the database
		await MongoDB.UpdateGuest( request.session.guestId, {
			inRoom: new ObjectId( rooms[ 0 ]._id )
		} )

		// Set the room ID in the session
		request.session.roomId = rooms[ 0 ]._id

		// Respond with the join code for confirmation
		respondToRequest( response, HTTPStatusCodes.OK, {
			code: rooms[ 0 ].joinCode
		} )
		log.info( `Guest '${ request.session.guestId }' joined room '${ rooms[ 0 ].name }' (${ rooms[ 0 ]._id })` )
	} catch ( errorMessage ) {
		log.error( `Failed to join guest '${ request.session.guestId }' to room with join code '${ request.params.code }' (${ errorMessage })!` )
		respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseOperationFailure
		} )
	}

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
			joinCode: request.session.guestId.toString() === rooms[ 0 ].createdBy.toString() ? rooms[ 0 ].joinCode : null, // Only if this guest is the room creator
			guests: [],
			messages: []
		}

		// Fetch all of the messages in this room
		const messages = await MongoDB.GetMessages( { roomId: rooms[ 0 ]._id } )

		// Create a mapping of guest IDs to names for all the guests in the messages
		// TODO: Guests that have ended their session won't be found, so just return their name as "Deleted Guest" or something
		const guestIDs = Array.from( new Set( messages.map( ( message ) => message.sentBy.toString() ) ) ).map( ( guestID ) => new ObjectId( guestID ) ) // Get all of the unique guest IDs
		const guestsInMessages = await MongoDB.GetGuests( { _id: { $in: guestIDs } } )
		const guestIDsToNames = new Map<string, string>()
		for ( const guest of guestsInMessages ) guestIDsToNames.set( guest._id.toString(), guest.name )

		// Add all of the messages to the payload
		for ( const message of messages ) roomPayload.messages.push( {
			content: message.content,
			attachments: message.attachments,
			sentAt: message.sentAt,
			sentBy: guestIDsToNames.get( message.sentBy.toString() )!
		} )

		// Add all the guests in this room
		const guests = await MongoDB.GetGuests( { inRoom: rooms[ 0 ]._id } )
		for ( const guest of guests ) roomPayload.guests.push( {
			name: guest.name,
			isRoomCreator: guest._id.toString() === rooms[ 0 ].createdBy.toString()
		} )

		// Send back the completed payload
		respondToRequest( response, HTTPStatusCodes.OK, {
			room: roomPayload
		} )
		log.info( `Gave data for room '${ rooms[ 0 ]._id }' to guest '${ request.session.guestId }'.` )
	} catch ( errorMessage ) {
		log.error( `Error while fetching data for room '${ request.session.roomId }' for guest '${ request.session.guestId }' (${ errorMessage })!` )
		respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseOperationFailure
		} )
	}

} )

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
		if ( errorMessage === undefined ) {

			// Attempt to delete the guest from the databasae
			try {
				await MongoDB.RemoveGuest( guestId )

				// Send back a success response with no data
				respondToRequest( response, HTTPStatusCodes.OK, {} )
				log.info( `Ended session for guest '${ guestId }'.` )
			} catch ( mongoErrorMessage ) {
				log.error( `Failed to end session for guest '${ guestId }' (${ mongoErrorMessage })!` )
				respondToRequest( response, HTTPStatusCodes.InternalServerError, {
					error: ErrorCodes.DatabaseDeleteFailure
				} )
			}

		} else {
			log.error( `Error while destroying Express session: '${ errorMessage }!` )
			respondToRequest( response, HTTPStatusCodes.InternalServerError, {
				error: ErrorCodes.ExpressSessionDestroyFailure
			} )
		}
	} )

} )

// Route to leave the current room
expressApp.delete( "/api/room", async ( request, response ) => {

	// Fail if the guest has not chosen a name yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.Unauthorized, {
		error: ErrorCodes.NameNotChosen
	} )

	// No room if the guest has not joined a room yet
	if ( request.session.roomId === undefined ) return respondToRequest( response, HTTPStatusCodes.OK, {
		room: null
	} )

	// Attempt to fetch their current room from the database
	try {
		const rooms = await MongoDB.GetRooms( {
			_id: new ObjectId( request.session.roomId )
		} )

		// Fail if the room somehow wasn't found?
		if ( rooms.length <= 0 ) return respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseFindFailure
		} )

		// Remove the guest from their room
		await MongoDB.UpdateGuest( request.session.guestId, {
			inRoom: null
		} )
		request.session.roomId = undefined

		// Remove the room if there are no guests in it anymore
		const guestsInRoom = await MongoDB.GetGuests( { inRoom: rooms[ 0 ]._id } )
		if ( guestsInRoom.length <= 0 ) {
			await MongoDB.RemoveRoom( rooms[ 0 ]._id )
			await MongoDB.RemoveMessages( { roomId: rooms[ 0 ]._id } )
			log.info( `Removed now empty room '${ rooms[ 0 ]._id }'.` )
		}

		// Send back success with no data
		respondToRequest( response, HTTPStatusCodes.OK )
		log.info( `Guest '${ request.session.guestId }' left room '${ rooms[ 0 ]._id }'.` )
	} catch ( errorMessage ) {
		log.error( `Error while guest '${ request.session.guestId }' leaving room '${ request.session.roomId }' (${ errorMessage })!` )
		respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseOperationFailure
		} )
	}

} )
