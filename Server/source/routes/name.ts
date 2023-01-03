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
	name: string
}

// Create a route for the user choosing their name
expressApp.post( "/api/name", async ( request, response ) => {
	log.debug( request.method, request.path, request.body )

	// Fail if the user has already set their name
	if ( request.session.chosenName !== undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.NameAlreadySet
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
	const payload: ChooseNamePayload = request.body

	// Fail if there is no name property in the payload
	if ( payload.name === undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.PayloadMissingProperty
	} )

	// Fail if the name does not meet validation requirements
	if ( validateChosenName( payload.name ) !== true ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.PayloadMalformedValue
	} )

	// Set the name in the session (new session is created in-case one already exits)
	request.session.regenerate( () => {
		request.session.chosenName = payload.name
		log.info( `Created session '${ request.sessionID }' for guest '${ payload.name }'.` )
	} )

	// Add the new guest to the database
	try {
		await MongoDB.AddGuest( payload.name )
		log.info( `Added new guest '${ payload.name }' to the database.` )
	} catch ( errorMessage ) {
		return log.error( `Failed to add new guest '${ payload.name }' to the database (${ errorMessage })!` )
	}

	// Display name in the console
	log.info( `Welcome, ${ payload.name }.` )

	// Send the name back as confirmation
	respondToRequest( response, HTTPStatusCodes.OK, {
		name: payload.name
	} )

} )

// Route for checking if the guest has chosen a name
expressApp.get( "/api/name", ( request, response ) => respondToRequest( response, HTTPStatusCodes.OK, {
	hasName: request.session.chosenName !== undefined
} ) )
