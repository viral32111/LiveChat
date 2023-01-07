// Import required third-party packages
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"

// Import required code from other scripts
import { expressApp } from "../main"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { ErrorCodes } from "../enumerations/errorCodes"
import { respondToRequest } from "../helpers/requests"
import MongoDB from "../classes/mongodb"

// Create the logger for this file
const log = getLogger( "routes/session" )

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
		if ( !errorMessage ) {

			// Attempt to delete the guest from the databasae
			try {
				await MongoDB.RemoveGuest( guestId )

				// Remove any rooms made by this guest, so long as they are empty
				const roomsByGuest = await MongoDB.GetRooms( { createdBy: new ObjectId( guestId ) } )
				for ( const room of roomsByGuest ) {
					const guestsInRoom = await MongoDB.GetGuests( { inRoom: room._id } )
					if ( guestsInRoom.length <= 0 ) {
						await MongoDB.RemoveRoom( room._id )
						await MongoDB.RemoveMessages( { roomId: room._id } )
						log.info( `Removed empty room '${ room._id }' created by guest '${ guestId }'.` )
					}
				}

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
