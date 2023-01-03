// Import variables from the main script
import { expressApp } from "../main"

// Import enumerations
import { ErrorCodes } from "../errorCodes"
import { HTTPStatusCodes } from "../httpStatusCodes"

// Import helper functions
import { respondToRequest } from "../helpers/requests"

// The regular expression for validating the name (alphanumeric characters, 2 to 30)
// NOTE: Keep this the same as the one on the client!
const nameValidationPattern = new RegExp( /^[A-Za-z0-9_]{2,30}$/ )

// Expected structure of the choose name JSON payload
interface NamePayload {
	name: string
}

// Create a route for the user choosing their name
expressApp.post( "/api/set-name", ( request, response ) => {

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
	if ( nameValidationPattern.test( payload.name ) !== true ) return respondToRequest( response, HTTPStatusCodes.BadRequest, {
		error: ErrorCodes.PayloadMalformedValue
	} )

	// TODO: Start a new cookie-based session that expires when the browser closes

	// TODO: Add user to Mongo

	// Send the name back as confirmation
	respondToRequest( response, HTTPStatusCodes.OK, {
		name: payload.name
	} )

} )
