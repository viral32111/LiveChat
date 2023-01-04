// Sends a JSON request to the server-side API
const httpRequest = ( method, route, payload = {} ) => $.ajax( route, {

	// Set the content type & payload
	contentType: "application/json",
	data: JSON.stringify( payload ),

	// Expected response type is JSON so it's automatically parsed
	dataType: "json",

	// HTTP method must be upper-case
	method: method.toUpperCase()

} )
