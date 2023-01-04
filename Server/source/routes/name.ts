// Import required third-party packages
import { getLogger } from "log4js"

// Import required data from other scripts
import { expressApp } from "../main"
import { ErrorCodes } from "../errorCodes"
import { HTTPStatusCodes } from "../httpStatusCodes"
import { respondToRequest } from "../helpers/requests"
import { validateChosenName } from "../helpers/validation"
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
	if ( request.session.chosenName !== undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.NameAlreadyChosen
	} )

	// Fail if the request payload is not JSON
	if ( request.is( "application/json" ) === false ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.InvalidContentType
	} )

	// Fail if there is no request payload
	if ( request.body.length <= 0 ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.MissingPayload
	} )

	// Cast the request body to the expected JSON structure
	const requestPayload: ChooseNamePayload = request.body

	// Fail if there is no name property in the payload
	if ( requestPayload.desiredName === undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.PayloadMissingProperty
	} )

	// Fail if the name does not meet validation requirements
	if ( validateChosenName( requestPayload.desiredName ) !== true ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.PayloadMalformedValue
	} )

	// Set the name in the session (new session is created in-case one already exits)
	request.session.regenerate( () => {
		request.session.chosenName = requestPayload.desiredName
		log.info( `Created session '${ request.sessionID }' for guest '${ requestPayload.desiredName }'.` )
	} )

	// Add the new guest to the database
	try {
		await MongoDB.AddGuest( requestPayload.desiredName )
		log.info( `Added new guest '${ requestPayload.desiredName }' to the database.` )
	} catch ( errorMessage ) {
		log.error( `Failed to add new guest '${ requestPayload.desiredName }' to the database (${ errorMessage })!` )
		return respondToRequest( response, HTTPStatusCodes.InternalServerError, {
			error: ErrorCodes.DatabaseInsertFailure
		} )
	}

	// Display name in the console
	log.info( `Welcome, ${ requestPayload.desiredName }.` )

	// Send the name back as confirmation
	respondToRequest( response, HTTPStatusCodes.OK, {
		chosenName: requestPayload.desiredName
	} )

} )

// Route for checking if the guest has chosen a name
expressApp.get( "/api/name", ( request, response ) => respondToRequest( response, HTTPStatusCodes.OK, {
	hasName: request.session.chosenName !== undefined
} ) )
