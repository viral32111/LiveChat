// Sends a JSON request to the server API
function httpRequest( method, route, payload = {} ) {
	method = method.toUpperCase() // HTTP method must be upper-case

	// GET requests must have their payload as a query string
	if ( method === "GET" ) return $.ajax( route, {
		method: method.toUpperCase(),
		data: payload,
		dataType: "json"
	} )

	// All other requests will sent their data as JSON in the request body
	else return $.ajax( route, {
		method: method.toUpperCase(),
		contentType: "application/json",
		data: JSON.stringify( payload ),
		dataType: "json"
	} )

}
