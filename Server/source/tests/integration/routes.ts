// Import required third-party packages
import chai from "chai"
import chaiHTTP from "chai-http"
import chaiString from "chai-string"

// Import required code from other scripts
import { expressApp } from "../../main"
import MongoDB from "../../mongodb"

// Enable support for HTTP requests & strings in Chai
chai.use( chaiHTTP )
chai.use( chaiString )

// Create a testing suite for the API routes
suite( "Integration - API routes", () => {

	// Purge the database after each test
	teardown( async () => {
		await MongoDB.PurgeGuests()
		await MongoDB.PurgeRooms()
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

	// Test the create new room API route
	test( "Create New Room", () => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).post( "/api/room" ).send( { name: "John's Room" } ).end( ( _, response ) => {
			chai.assert.equal( response.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( response.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( async ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			chai.assert.startsWith( chooseNameResponse.header[ "set-cookie" ], "sessionIdentifier=", "Expected HTTP response to set a session identifier cookie" )

			// Should succeed
			userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } ).end( ( _, createRoomResponse ) => {
				chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
				chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
				chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
				chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )
			} )
		} )

	} )

	// Test the get public rooms API route
	test( "Get Public Rooms", () => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).get( "/api/rooms" ).end( ( _, response ) => {
			chai.assert.equal( response.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( response.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( async ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			chai.assert.startsWith( chooseNameResponse.header[ "set-cookie" ], "sessionIdentifier=", "Expected HTTP response to set a session identifier cookie" )

			// Should succeed with 0 rooms
			userAgent.get( "/api/rooms" ).end( ( _, getRoomsResponse ) => {
				chai.assert.equal( getRoomsResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( getRoomsResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.deepEqual( getRoomsResponse.body, { publicRooms: [] }, "Expected HTTP response payload to contain an array" )
				chai.assert.lengthOf( getRoomsResponse.body.publicRooms, 0, "Expected HTTP response payload to contain an empty array" )
			} )

			// Create room...
			userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } ).end( ( _, createRoomResponse ) => {
				chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
				chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
				chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
				chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

				// Should suceed with 1 room
				userAgent.get( "/api/rooms" ).end( ( _, getRoomsResponse ) => {
					chai.assert.equal( getRoomsResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
					chai.assert.containIgnoreCase( getRoomsResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
					chai.assert.hasAllKeys( getRoomsResponse.body, [ "publicRooms" ], "Expected HTTP response payload to contain all required keys" )
					chai.assert.typeOf( getRoomsResponse.body.publicRooms, "array", "Expected HTTP response payload publicRooms property to be an array" )
					chai.assert.lengthOf( getRoomsResponse.body.publicRooms, 1, "Expected HTTP response payload publicRooms property to contain 1 item" )
				} )
			} )

		} )

	} )

	// Test the join room API route
	test( "Join Room", () => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).get( "/api/room/aabbcc" ).end( ( _, response ) => {
			chai.assert.equal( response.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( response.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( async ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			chai.assert.startsWith( chooseNameResponse.header[ "set-cookie" ], "sessionIdentifier=", "Expected HTTP response to set a session identifier cookie" )

			// Should fail as there is no room with this join code
			userAgent.get( "/api/room/aabbcc" ).end( ( _, joinRoomResponse ) => {
				chai.assert.equal( joinRoomResponse.status, 500, "Expected HTTP response status code to be 500 Internal Server Error" )
				chai.assert.containIgnoreCase( joinRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.deepEqual( joinRoomResponse.body, { error: 9 }, "Expected HTTP response payload to contain error code 9" )
			} )

			// Create room...
			userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } ).end( ( _, createRoomResponse ) => {
				chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
				chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
				chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
				chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

				// Should succeed
				userAgent.get( `/api/room/${ createRoomResponse.body.joinCode }` ).end( ( _, joinRoomResponse ) => {
					chai.assert.equal( joinRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
					chai.assert.containIgnoreCase( joinRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
					chai.assert.deepEqual( joinRoomResponse.body, { name: "John's Room" }, "Expected HTTP response payload to contain the room name" )
				} )
			} )
		} )

	} )

	// Test the end session API route
	test( "End Session", () => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).delete( "/api/session" ).end( ( _, response ) => {
			chai.assert.equal( response.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( response.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( async ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			chai.assert.startsWith( chooseNameResponse.header[ "set-cookie" ], "sessionIdentifier=", "Expected HTTP response to set a session identifier cookie" )

			// Should succeed
			userAgent.delete( "/api/session" ).end( ( _, response ) => {
				chai.assert.equal( response.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( response.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.deepEqual( response.body, {}, "Expected HTTP response payload to be empty" )
			} )

		} )

	} )

} )
