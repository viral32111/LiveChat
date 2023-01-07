// User-friendly messages for the error codes sent by the server
// NOTE: Keep this the same as the ones on the server!
const serverErrorCodeMessages = {
	0: "Invalid request content type",
	1: "No request payload",
	2: "Request payload missing one or more properties",
	3: "One or more request payload values are malformed",
	4: "You have already chosen a name",
	5: "Failed to add data into the database",
	6: "You have not chosen a name yet",
	7: "Failed to remove your session",
	8: "Failed to remove data from the database",
	9: "Failed to find data in the database",
	10: "Connection must be upgraded to WebSocket",
	11: "You have not joined a room yet",
	12: "No files uploaded",
	13: "No data available",
	14: "Failed to perform operation(s) on the database",
}

// Shows the feedback modal for a server API error
function handleServerErrorCode( responseText ) {

	// Attempt to parse the response as JSON
	try {
		const errorPayload = JSON.parse( responseText )

		// If the server didn't give us an error code
		if ( errorPayload.error === undefined ) showErrorModal( "An unknown server error occured" )
	
		// If there is no message for this error code
		else if ( serverErrorCodeMessages[ errorPayload.error ] === undefined ) showErrorModal( `An unhandled server error occured (${ payload.error })` )
		
		// Display the friendly error message, as we have an error code
		else showErrorModal( serverErrorCodeMessages[ errorPayload.error ] )
	} catch {
		showErrorModal( "Failed to parse server response payload" )
	}

}
