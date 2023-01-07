// Import code from third-party packages
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"

// Import code from other scripts
import { expressApp } from "../main"
import { ErrorCodes } from "../enumerations/errorCodes"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { respondToRequest } from "../helpers/requests"
import { validateGuestName } from "../helpers/validation"
import { ChooseNamePayload } from "../interfaces/routes/requests"
import MongoDB from "../classes/mongodb"

// Create the logger for this file
const log = getLogger( "routes/name" )

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

	// Attempt to add the new guest to the database
	try {
		const newGuest = await MongoDB.AddGuest( requestPayload.desiredName )

		// Set the guest ID in the session data (a new session is created in case one already exists)
		request.session.regenerate( () => {
			request.session.guestId = newGuest.insertedId

			// Send the name back as confirmation, once the session is saved
			request.session.save( () => respondToRequest( response, HTTPStatusCodes.OK, {
				chosenName: requestPayload.desiredName
			} ) )
			log.info( `Created session '${ request.sessionID }' for guest '${ requestPayload.desiredName }' (${ newGuest.insertedId }).` )
		} )
	} catch ( errorMessage ) {
		log.error( `Failed to choose name '${ requestPayload.desiredName }' for new guest (${ errorMessage })!` )
		respondToRequest( response, HTTPStatusCodes.InternalServerError, {
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
		respondToRequest( response, HTTPStatusCodes.OK, {
			name: foundGuests[ 0 ].name
		} )
		log.info( `Found name '${ foundGuests[ 0 ].name }' for guest '${ foundGuests[ 0 ]._id }.'` )
	} catch ( errorMessage ) {
		log.error( `Failed to get name for guest '${ request.session.guestId }' (${ errorMessage })!` )
		respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseOperationFailure
		} )
	}

} )
