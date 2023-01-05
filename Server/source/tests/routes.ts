// Import required third-party packages
import chai from "chai"
import chaiHTTP from "chai-http"
import chaiString from "chai-string"

// Import required code from other scripts
import { expressApp, httpServer } from "../main"
import MongoDB from "../mongodb"

// Enable support for HTTP requests & strings in Chai
chai.use( chaiHTTP )
chai.use( chaiString )

// TODO: These can't be tested in CI because they require a MongoDB instance to be running

// Create a testing suite for the API routes
suite( "API routes", () => {

	// Purge the database after each test
	teardown( async () => {
		await MongoDB.PurgeGuests()
	} )

	// Test the choose name API route
	test( "Choose Name", () => {

		// Should succeed when sending a POST request with a valid name
		chai.request( expressApp ).post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( async ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.deepEqual( JSON.parse( response.text ), { chosenName: "JohnSmith" }, "Expected HTTP response body to be a JSON object containing the chosen name" )
			chai.assert.startsWith( response.header[ "set-cookie" ], "sessionIdentifier=", "Expected HTTP response to set a session identifier cookie" )

			// Check if the name is now in MongoDB
			const guest = await MongoDB.GetGuest( "JohnSmith" )
			chai.assert.isNotNull( guest, "Expected the guest to be in MongoDB" )
			chai.assert.equal( guest?.name, "JohnSmith", "Expected the guest's name to be what was sent" )
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

	// Test the check name API route
	test( "Check Name", () => {

		// Should return false as no name has been chosen yet
		chai.request( expressApp ).get( "/api/name" ).end( ( _, response ) => {
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )

			chai.assert.equal( response.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.deepEqual( JSON.parse( response.text ), { hasName: false }, "Expected HTTP response body to be a JSON object containing false" )
		} )

		// Should return true as we choose a name, then check
		chai.request( expressApp ).post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( async ( _, chooseNameResponse ) => {
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.deepEqual( JSON.parse( chooseNameResponse.text ), { chosenName: "JohnSmith" }, "Expected HTTP response body to be a JSON object containing the chosen name" )

			// Get the value of the session identifier cookie, so we can use it in the next request to appear as if we're logged in
			const sessionIdentifier = chooseNameResponse.header[ "set-cookie" ].toString().split( "sessionIdentifier=" )[ 1 ].split( ";" )[ 0 ]

			chai.request( expressApp ).get( "/api/name" ).set( "cookie", `sessionIdentifier=${ sessionIdentifier }` ).end( ( _, checkNameResponse ) => {
				chai.assert.containIgnoreCase( checkNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.equal( checkNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.deepEqual( JSON.parse( checkNameResponse.text ), { hasName: true }, "Expected HTTP response body to be a JSON object containing true" )
			} )
		} )
	} )

	// Stop everything after all tests have completed
	// TODO: This doesn't seem to exit the program?
	/*suiteTeardown( () => {
		MongoDB.Disconnect().then( () => {
			//console.debug( "DISCONNECTED FROM MONGODB" )
			httpServer.close( () => {
				//console.log( "HTTP SERVER STOPPED" )
				//process.exit( 0 )
			} )
		} )
	} )*/

} )
