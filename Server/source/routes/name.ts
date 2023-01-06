// Import required code from third-party packages
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"

// Import required code from other scripts
import { expressApp } from "../main"
import { ErrorCodes } from "../enumerations/errorCodes"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { respondToRequest } from "../helpers/requests"
import { validateGuestName } from "../helpers/validation"
import MongoDB from "../mongodb"

// Create the logger for this file
const log = getLogger( "routes/name" )

// Structure of the choose name payload
interface ChooseNamePayload {
	desiredName: string
}

// Create a route for the user choosing their name
expressApp.post( "/api/name", async ( request, response ) => {

	// Fail if the user has already chosen their name
	if ( request.session.guestId !== undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.NameAlreadyChosen
	} )

	// Fail if the request payload is not JSON, or there is no request payload
	if ( request.is( "application/json" ) === false ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.InvalidContentType } )
	if ( request.body.length <= 0 ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.MissingPayload } )

	// Cast the request body to the expected JSON structure
	const requestPayload: ChooseNamePayload = request.body

	// Fail if there is no name property in the payload, or it is invalid
	if ( requestPayload.desiredName === undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.PayloadMissingProperty } )
	if ( validateGuestName( requestPayload.desiredName ) !== true ) return respondToRequest( response, HTTPStatusCodes.BadRequest, { error: ErrorCodes.PayloadMalformedValue } )

	// Trt to add the new guest to the database
	try {
		// TODO: Check for guest with the same name already in the database

		const newGuest = await MongoDB.AddGuest( requestPayload.desiredName )
		log.info( `Added new guest '${ requestPayload.desiredName }' (${ newGuest.insertedId }) to the database.` )

		// Set the guest ID in the session data (a new session is created in case one already exists)
		request.session.regenerate( () => {
			request.session.guestId = newGuest.insertedId
			log.info( `Created session '${ request.sessionID }' for guest '${ requestPayload.desiredName }' (${ newGuest.insertedId }).` )

			// Send the name back as confirmation
			respondToRequest( response, HTTPStatusCodes.OK, {
				chosenName: requestPayload.desiredName
			} )
		} )

	// Send back an failure response if the database insert failed
	} catch ( errorMessage ) {
		log.error( `Failed to add new guest '${ requestPayload.desiredName }' to the database (${ errorMessage })!` )
		return respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseInsertFailure
		} )
	}

} )

// Route for getting the guest's name
expressApp.get( "/api/name", async ( request, response ) => {

	// No name if the user has not chosen one yet
	if ( request.session.guestId === undefined ) return respondToRequest( response, HTTPStatusCodes.OK, {
		name: null
	} )

	// Try to get the guest from the database
	try {
		const foundGuests = await MongoDB.GetGuests( {
			_id: new ObjectId( request.session.guestId ) // Apparently .guestId is not already an ObjectId, despite that being the type of the property in the interface...
		} )

		// Fail if the guest somehow wasn't found?
		if ( foundGuests.length <= 0 ) return respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseFindFailure
		} )

		// Send their name back
		log.info( `Found name '${ foundGuests[ 0 ].name }' for guest '${ foundGuests[ 0 ]._id }.'` )
		respondToRequest( response, HTTPStatusCodes.OK, {
			name: foundGuests[ 0 ].name
		} )

	// Fail if an error occurred
	} catch ( errorMessage ) {
		log.error( `Failed to get guest '${ request.session.guestId }' from database (${ errorMessage })!` )
		return respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseFindFailure
		} )
	}

} )
