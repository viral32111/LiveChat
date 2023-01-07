// Import third-party packages
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"

// Import code from other scripts
import { expressApp } from "../main"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { ErrorCodes } from "../enumerations/errorCodes"
import { respondToRequest } from "../helpers/requests"
import { validateRoomJoinCode, validateRoomName } from "../helpers/validation"
import { webSocketBroadcastPayload, webSocketClients } from "../helpers/webSocketBroadcast"
import { GuestPayload, PublicRoomPayload, RoomPayload } from "../interfaces/routes/responses"
import { CreateRoomPayload } from "../interfaces/routes/requests"
import { WebSocketGuestUpdatePayload } from "../interfaces/webSocket"
import { WebSocketPayloadTypes } from "../enumerations/webSocket"
import MongoDB from "../classes/mongodb"

// Create the logger for this file
const log = getLogger( "routes/room" )

// Broadcasts the list of guests in a room so they can update their participants list
async function broadcastGuestsUpdate( guestId: ObjectId, roomId: ObjectId ) {

	// Get this room
	const rooms = await MongoDB.GetRooms( {
		_id: new ObjectId( roomId )
	} )

	// Fail if the room does not exist
	if ( rooms.length === 0 ) throw new Error( `Room '${ roomId }' somehow does not exist in the database?` )

	// Fetch all the guests in this room
	const guestsInRoom = await MongoDB.GetGuests( {
		inRoom: rooms[ 0 ]._id
	} )

	// Create the payload to send to all guests in this room
	const guestsPayload: GuestPayload[] = []
	for ( const guest of guestsInRoom ) guestsPayload.push( {
		name: guest.name,
		isRoomCreator: guest._id.toString() === rooms[ 0 ].createdBy.toString()
	} )

	// Broadcast the payload to all guests in this room
	await webSocketBroadcastPayload( WebSocketPayloadTypes.GuestsUpdate, {
		guests: guestsPayload
	} as WebSocketGuestUpdatePayload, guestId, roomId )

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

		// Update the guest's room ID in the database & session
		await MongoDB.UpdateGuest( request.session.guestId, {
			inRoom: new ObjectId( rooms[ 0 ]._id )
		} )
		request.session.roomId = rooms[ 0 ]._id

		// Create the room in the map if it doesn't exist
		const roomClients = webSocketClients.get( request.session.roomId.toString() )
		if ( roomClients === undefined ) webSocketClients.set( request.session.roomId.toString(), new Map() )

		// Send the guests in the room a new participants list
		await broadcastGuestsUpdate( request.session.guestId, rooms[ 0 ]._id )
		log.info( `Broadcasted guest update in room '${ request.session.roomId }' due to guest '${ request.session.guestId }' joining.` )

		// Respond with the join code for confirmation, once the session has been saved
		request.session.save( () => respondToRequest( response, HTTPStatusCodes.OK, {
			code: rooms[ 0 ].joinCode
		} ) )
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
	// TODO: Sometimes this is undefined right after joining a room, but only for the second time...?
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
		const guestIDsToNames = new Map<string, string | null>()
		for ( const message of messages ) {
			const guestId = message.sentBy.toString()
			if ( guestIDsToNames.has( guestId ) === false ) guestIDsToNames.set( guestId, null ) // Default to null
		}
		const guestsInMessages = await MongoDB.GetGuests( { _id: { $in: Array.from( guestIDsToNames.keys() ).map( guestId => new ObjectId( guestId ) ) } } )
		for ( const guest of guestsInMessages ) {
			guestIDsToNames.set( guest._id.toString(), guest.name )
		}

		// Add all of the messages to the payload
		for ( const message of messages ) roomPayload.messages.push( {
			content: message.content,
			attachments: message.attachments,
			sentAt: message.sentAt,
			sentBy: guestIDsToNames.get( message.sentBy.toString() ) ?? null
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

		// Remove the guest from their room in the database & session
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

		// Otherwise if guests are still in it, send them a new participants list
		} else {
			await broadcastGuestsUpdate( request.session.guestId, rooms[ 0 ]._id )
			log.info( `Broadcasted guest update in room '${ rooms[ 0 ]._id }' due to guest '${ request.session.guestId }' leaving.` )
		}

		// Send back success with no data, once the session is saved
		request.session.save( () => respondToRequest( response, HTTPStatusCodes.OK ) )
		log.info( `Guest '${ request.session.guestId }' left room '${ rooms[ 0 ]._id }'.` )
	} catch ( errorMessage ) {
		log.error( `Error while guest '${ request.session.guestId }' leaving room '${ request.session.roomId }' (${ errorMessage })!` )
		respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseOperationFailure
		} )
	}

} )
