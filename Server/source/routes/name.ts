// Import required variables from the main script
import { expressApp } from "../main"

// Import required enumerations
import { ErrorCodes } from "../errorCodes"
import { HTTPStatusCodes } from "../httpStatusCodes"

// Import required helper functions
import { respondToRequest } from "../helpers/requests"
import { mongoAddGuest } from "../mongodb"
import { validateChosenName } from "../helpers/validation"

// Expected structure of the choose name JSON payload
interface NamePayload {
	name: string
}

// Extend the Express session data interface to include our own properties
declare module "express-session" {
	interface SessionData {
		chosenName: string
	}
}

// Create a route for the user choosing their name
expressApp.post( "/api/set-name", async ( request, response ) => {

	console.debug( "/api/set-name" )

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
	const payload: NamePayload = request.body

	// Fail if there is no name property in the payload
	if ( payload.name === undefined ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.PayloadMissingProperty
	} )

	// Fail if the name does not meet validation requirements
	if ( validateChosenName( payload.name ) !== true ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.PayloadMalformedValue
	} )

	// Set the name in the session
	request.session.chosenName = payload.name
	console.debug( "set name in session" )

	// Add the new guest to MongoDB
	try {
		console.debug( "adding to mongodb..." )
		await mongoAddGuest( payload.name )
		console.debug( "added to mongo" )
	} catch ( error ) {
		return console.error( "Failed to add new guest to MongoDB:", error )
	}

	// Display message in console
	console.log( "New user:", payload.name )

	// Send the name back as confirmation
	respondToRequest( response, HTTPStatusCodes.OK, {
		name: payload.name
	} )

} )
