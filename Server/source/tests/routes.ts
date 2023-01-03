// Import required third-party packages
import chai from "chai"
import chaiHTTP from "chai-http"
import chaiString from "chai-string"

// Import required variables from the main script
import { expressApp, httpServer } from "../main"

// Enable support for HTTP requests & strings in Chai
chai.use( chaiHTTP )
chai.use( chaiString )

// TODO: These can't be tested in CI because they require a MongoDB instance to be running

// Create a testing suite for the API routes
suite( "API routes", () => {

	// Test the choose name API route
	test( "Choose Name", () => {

		// Should succeed when sending a POST request with a valid name
		chai.request( expressApp ).post( "/api/set-name" ).send( { name: "JohnSmith" } ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.deepEqual( JSON.parse( response.text ), { name: "JohnSmith" }, "Expected HTTP response body to be a JSON object containing the chosen name" )

			// TODO: Check for sessionIdentifier cookie
			// TODO: Check if the name is now in MongoDB
		} )

		// Should error when sending an invalid content type
		chai.request( expressApp ).post( "/api/set-name" ).set( "content-type", "application/x-www-form-urlencoded" ).send( "" ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
			chai.assert.deepEqual( JSON.parse( response.text ), { error: 0 }, "Expected HTTP response payload to contain error code 0" )
		} )

		// Should error when sending an empty POST request
		// TODO: Returns error code 2?
		/*chai.request( expressApp ).post( "/api/set-name" ).set( "content-type", "application/json" ).send( "" ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
			chai.assert.deepEqual( JSON.parse( response.text ), { error: 1 }, "Expected HTTP response payload to contain error code 1" )
		} )*/

		// Should error when sending POST request without a name
		chai.request( expressApp ).post( "/api/set-name" ).set( "content-type", "application/json" ).send( {} ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
			chai.assert.deepEqual( JSON.parse( response.text ), { error: 2 }, "Expected HTTP response payload to contain error code 2" )
		} )

		// Should error when sending a POST request with an invalid name
		chai.request( expressApp ).post( "/api/set-name" ).set( "content-type", "application/json" ).send( { name: "John&Smith" } ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
			chai.assert.deepEqual( JSON.parse( response.text ), { error: 3 }, "Expected HTTP response payload to contain error code 3" )
		} )

	} )

	// Stop the HTTP server after all tests have completed
	// TODO: Doesn't seem to work? Runs BEFORE the async MongoDB stuff finishes!
	suiteTeardown( () => {
		console.debug( "Tests over, stopping web server..." )
		httpServer.close()
	} )

} )
