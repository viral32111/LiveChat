// Import variables from the main script
import { expressApp } from "../main"

// Import constant variables
import { INVALID_CONTENT_TYPE, NO_PAYLOAD, PAYLOAD_MALFORMED_VALUE, PAYLOAD_MISSING_PROPERTY } from "../errorCodes"
import { BAD_REQUEST, OK } from "../httpStatusCodes"

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

	// DEBUGGING
	console.debug( "/api/set-name:", request.body )

	// Fail if the request payload is not JSON
	if ( !request.is( "application/json" ) ) return respondToRequest( response, BAD_REQUEST, {
		error: INVALID_CONTENT_TYPE
	} )

	// Fail if there is no request payload
	if ( request.body.length <= 0 ) return respondToRequest( response, BAD_REQUEST, {
		error: NO_PAYLOAD
	} )

	// Cast the request body to the expected JSON structure
	const payload: NamePayload = request.body

	// Fail if there is no name property in the payload
	if ( !payload.name ) return respondToRequest( response, BAD_REQUEST, {
		error: PAYLOAD_MISSING_PROPERTY
	} )

	// Fail if the name does not meet validation requirements
	if ( !nameValidationPattern.test( payload.name ) ) return respondToRequest( response, BAD_REQUEST, {
		error: PAYLOAD_MALFORMED_VALUE
	} )

	// DEBUGGING
	console.debug( "NAME:", payload.name )

	// TODO: Start a new cookie-based session that expires when the browser closes

	// Send the name back as confirmation
	respondToRequest( response, OK, {
		name: payload.name
	} )

} )
