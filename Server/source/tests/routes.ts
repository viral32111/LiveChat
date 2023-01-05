// Import required third-party packages
import chai from "chai"
import chaiHTTP from "chai-http"
import chaiString from "chai-string"
//import { getLogger } from "log4js"

// Set the environment to testing
process.env.NODE_ENV = "test"

// Import required code from other scripts
import { expressApp, httpServer } from "../main"
import MongoDB from "../mongodb"

// Enable support for HTTP requests & strings in Chai
chai.use( chaiHTTP )
chai.use( chaiString )

// TODO: These can't be tested in CI because they require a MongoDB instance to be running

// Create a testing suite for the API routes
suite( "API routes", () => {

	// Test the choose name API route
	test( "Choose Name", () => {

		// Should succeed when sending a POST request with a valid name
		chai.request( expressApp ).post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.deepEqual( JSON.parse( response.text ), { chosenName: "JohnSmith" }, "Expected HTTP response body to be a JSON object containing the chosen name" )

			// TODO: Check for sessionIdentifier cookie
			// TODO: Check if the name is now in MongoDB
		} )

		// Should error when sending an invalid content type
		chai.request( expressApp ).post( "/api/name" ).set( "content-type", "application/x-www-form-urlencoded" ).send( "" ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
			chai.assert.deepEqual( JSON.parse( response.text ), { error: 0 }, "Expected HTTP response payload to contain error code 0" )
		} )

		// Should error when sending POST request without a name
		chai.request( expressApp ).post( "/api/name" ).set( "content-type", "application/json" ).send( {} ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
			chai.assert.deepEqual( JSON.parse( response.text ), { error: 2 }, "Expected HTTP response payload to contain error code 2" )
		} )

		// Should error when sending a POST request with an invalid name
		chai.request( expressApp ).post( "/api/name" ).set( "content-type", "application/json" ).send( { desiredName: "John&Smith" } ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
			chai.assert.deepEqual( JSON.parse( response.text ), { error: 3 }, "Expected HTTP response payload to contain error code 3" )
		} )

	} )

	// Stop everything after all tests have completed
	// TODO: This doesn't seem to exit the program?
	suiteTeardown( () => {
		MongoDB.Disconnect().then( () => {
			//console.debug( "DISCONNECTED FROM MONGODB" )
			httpServer.close( () => {
				//console.log( "HTTP SERVER STOPPED" )
				//process.exit( 0 )
			} )
		} )
	} )

} )
