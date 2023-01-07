// Import third-party packages
import chai, { expect } from "chai"
import chaiHTTP from "chai-http"
import chaiString from "chai-string"
import ws from "ws"

// Import code from other scripts
import { expressApp } from "../../main"
import MongoDB from "../../classes/mongodb"

// Enable support for HTTP requests & strings in Chai
chai.use( chaiHTTP )
chai.use( chaiString )

// Create a testing suite for the API routes
suite( "Integration - API routes", () => {

	// Purge the entire database before any tests are ran & after all tests have finished
	suiteSetup( async () => {
		await MongoDB.PurgeGuests()
		await MongoDB.PurgeRooms()
		await MongoDB.PurgeMessages()
		await MongoDB.PurgeSessions()
	} )
	suiteTeardown( async () => {
		await MongoDB.PurgeGuests()
		await MongoDB.PurgeRooms()
		await MongoDB.PurgeMessages()
		await MongoDB.PurgeSessions()
	} )

	// Purge any modified database collections before & after each test
	setup( async () => {
		await MongoDB.PurgeGuests()
		await MongoDB.PurgeRooms()
		await MongoDB.PurgeMessages()
	} )
	teardown( async () => {
		await MongoDB.PurgeGuests()
		await MongoDB.PurgeRooms()
		await MongoDB.PurgeMessages()
	} )

	// Test the choose name API route
	// NOTE: Async/await on this one because we can't use the done() callback for 5 concurrent requests
	test( "Choose Name", async () => {

		// Should succeed when sending a POST request with a valid name
		const chooseNameResponse1 = await chai.request( expressApp ).post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse1.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse1.body, { chosenName: "JohnSmith" }, "Expected HTTP response body to be a JSON object containing the chosen name" )
		expect( chooseNameResponse1, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

		// Check if the name is now in MongoDB
		const guestsDatabaseResponse = await MongoDB.GetGuests( { name: "JohnSmith" } )
		chai.assert.lengthOf( guestsDatabaseResponse, 1, "Expected the guest to be in MongoDB" )
		chai.assert.equal( guestsDatabaseResponse[ 0 ].name, "JohnSmith", "Expected the guest's name to be what was sent" )

		// Should fail when sending an invalid content type
		const chooseNameResponse2 = await chai.request( expressApp ).post( "/api/name" ).set( "content-type", "application/x-www-form-urlencoded" ).send( "" )
		chai.assert.equal( chooseNameResponse2.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
		chai.assert.containIgnoreCase( chooseNameResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse2.body, { error: 0 }, "Expected HTTP response payload to contain error code 0" )

		// Should fail when sending POST request without a name
		const chooseNameResponse3 = await chai.request( expressApp ).post( "/api/name" ).set( "content-type", "application/json" ).send( {} )
		chai.assert.equal( chooseNameResponse3.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
		chai.assert.containIgnoreCase( chooseNameResponse3.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse3.body, { error: 2 }, "Expected HTTP response payload to contain error code 2" )

		// Should fail when sending a POST request with an invalid name
		const chooseNameResponse4 = await chai.request( expressApp ).post( "/api/name" ).set( "content-type", "application/json" ).send( { desiredName: "John&Smith" } )
		chai.assert.equal( chooseNameResponse4.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
		chai.assert.containIgnoreCase( chooseNameResponse4.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse4.body, { error: 3 }, "Expected HTTP response payload to contain error code 3" )

	} )

	// Test the check name API route
	test( "Check Name", ( finishTest ) => {

		// Should be null as no name has been chosen yet
		chai.request( expressApp ).get( "/api/name" ).end( ( _, checkNameResponse ) => {
			chai.assert.equal( checkNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( checkNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( checkNameResponse.body, { name: null }, "Expected HTTP response payload to contain null" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the name" )
			expect( chooseNameResponse ).to.have.cookie( "sessionIdentifier" )

			// Should succeed
			userAgent.get( "/api/name" ).end( ( _, checkNameResponse ) => {
				chai.assert.equal( checkNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( checkNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.deepEqual( checkNameResponse.body, { name: "JohnSmith" }, "Expected HTTP response payload to contain the name" )

				finishTest()
			} )
		} )

	} )

	// Test the create new room API route
	test( "Create New Room", ( finishTest ) => {

		// Should fail as no name has been chosen yet
		chai.request( expressApp ).post( "/api/room" ).send( { name: "John's Room" } ).end( ( _, createRoomResponse ) => {
			chai.assert.equal( createRoomResponse.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( createRoomResponse.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

			// Should succeed
			userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } ).end( ( _, createRoomResponse ) => {
				chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
				chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
				chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
				chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

				finishTest()
			} )
		} )

	} )

	// Test the get public rooms API route
	test( "Get Public Rooms", ( finishTest ) => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).get( "/api/rooms" ).end( ( _, getRoomsResponse ) => {
			chai.assert.equal( getRoomsResponse.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( getRoomsResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( getRoomsResponse.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

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

					finishTest()
				} )
			} )

		} )

	} )

	// Test the join room API route
	test( "Join Room", ( finishTest ) => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).get( "/api/room/aabbcc" ).end( ( _, joinRoomResponse ) => {
			chai.assert.equal( joinRoomResponse.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( joinRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( joinRoomResponse.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

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
					chai.assert.deepEqual( joinRoomResponse.body, { code: createRoomResponse.body.joinCode }, "Expected HTTP response payload to contain the room join code" )

					finishTest()
				} )
			} )
		} )

	} )

	// Test the get room data API route
	test( "Get Room Data", ( finishTest ) => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).get( "/api/room" ).end( ( _, roomDataResponse ) => {
			chai.assert.equal( roomDataResponse.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( roomDataResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( roomDataResponse.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

			// Should be null as no room has been chosen
			userAgent.get( "/api/room" ).end( ( _, roomDataResponse ) => {
				chai.assert.equal( roomDataResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( roomDataResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.deepEqual( roomDataResponse.body, { room: null }, "Expected HTTP response payload to contain null room" )
			} )

			// Create a room...
			userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } ).end( ( _, createRoomResponse ) => {
				chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
				chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
				chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
				chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

				// Join the room...
				userAgent.get( `/api/room/${ createRoomResponse.body.joinCode }` ).end( ( _, joinRoomResponse ) => {
					chai.assert.equal( joinRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
					chai.assert.containIgnoreCase( joinRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
					chai.assert.deepEqual( joinRoomResponse.body, { code: createRoomResponse.body.joinCode }, "Expected HTTP response payload to contain the room join code" )

					// Should contain room data
					userAgent.get( "/api/room" ).end( ( _, roomDataResponse ) => {
						chai.assert.equal( roomDataResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
						chai.assert.containIgnoreCase( roomDataResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
						chai.assert.hasAllDeepKeys( roomDataResponse.body, [ "room" ], "Expected HTTP response payload to contain all required keys" )
						chai.assert.hasAllDeepKeys( roomDataResponse.body.room, [ "name", "isPrivate", "joinCode", "guests", "messages" ], "Expected HTTP response room payload to contain all required keys" )
						chai.assert.equal( roomDataResponse.body.room.name, "John's Room", "Expected HTTP response room payload name property to be the room name" )
						chai.assert.equal( roomDataResponse.body.room.isPrivate, false, "Expected HTTP response room payload isPrivate property to be false" )
						chai.assert.equal( roomDataResponse.body.room.joinCode, createRoomResponse.body.joinCode, "Expected HTTP response room payload joinCode property to be the room join code" )
						chai.assert.typeOf( roomDataResponse.body.room.guests, "array", "Expected HTTP response room payload guests property to be an array" )
						chai.assert.typeOf( roomDataResponse.body.room.messages, "array", "Expected HTTP response room payload messages property to be an array" )

						finishTest()
					} )
				} )
			} )
		} )

	} )

	// Test the end session API route
	test( "End Session", ( finishTest ) => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).delete( "/api/session" ).end( ( _, endSessionResponse ) => {
			chai.assert.equal( endSessionResponse.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( endSessionResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( endSessionResponse.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

			// Should succeed
			userAgent.delete( "/api/session" ).end( ( _, endSessionResponse ) => {
				chai.assert.equal( endSessionResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( endSessionResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.deepEqual( endSessionResponse.body, {}, "Expected HTTP response payload to be empty" )

				finishTest()
			} )

		} )

	} )

	// TODO: Upload file API route - PUT /api/upload

	// Test the upgrade to WebSocket connection API route
	test( "Upgrade to WebSocket Connection", ( finishTest ) => {

		// Should fail as no name has been chosen
		chai.request( expressApp ).get( "/api/chat" ).end( ( _, upgradeToWebSocketResponse ) => {
			chai.assert.equal( upgradeToWebSocketResponse.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
			chai.assert.containIgnoreCase( upgradeToWebSocketResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( upgradeToWebSocketResponse.body, { error: 6 }, "Expected HTTP response payload to contain error code 6" )
		} )

		// Create an agent to persist cookies/session state, then choose a name...
		const userAgent = chai.request.agent( expressApp )
		userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } ).end( ( _, chooseNameResponse ) => {
			chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
			chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
			chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
			expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

			// Should fail as no room has been chosen
			userAgent.get( "/api/chat" ).end( ( _, upgradeToWebSocketResponse ) => {
				chai.assert.equal( upgradeToWebSocketResponse.status, 403, "Expected HTTP response status code to be 403 Forbidden" )
				chai.assert.containIgnoreCase( upgradeToWebSocketResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.deepEqual( upgradeToWebSocketResponse.body, { error: 11 }, "Expected HTTP response payload to contain error code 11" )
			} )

			// Create a room...
			userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } ).end( ( _, createRoomResponse ) => {
				chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
				chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
				chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
				chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
				chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
				chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

				// Join the room...
				userAgent.get( `/api/room/${ createRoomResponse.body.joinCode }` ).end( ( _, joinRoomResponse ) => {
					chai.assert.equal( joinRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
					chai.assert.containIgnoreCase( joinRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
					chai.assert.deepEqual( joinRoomResponse.body, { code: createRoomResponse.body.joinCode }, "Expected HTTP response payload to contain the room join code" )

					// Should fail as WebSocket upgrade headers are not present
					userAgent.get( "/api/chat" ).end( ( _, upgradeToWebSocketResponse ) => {
						chai.assert.equal( upgradeToWebSocketResponse.status, 426, "Expected HTTP response status code to be 426 Upgrade Required" )
						chai.assert.containIgnoreCase( upgradeToWebSocketResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
						chai.assert.deepEqual( upgradeToWebSocketResponse.body, { error: 10 }, "Expected HTTP response payload to contain error code 10" )
					} )

					// Should succeed - https://medium.com/geekculture/test-a-websocket-f1156e0e3215
					const wsClient = new ws.WebSocket( "ws://127.0.0.1:5000/api/chat", {
						headers: { "Cookie": chooseNameResponse.header[ "set-cookie" ][ 0 ].split( ";" )[ 0 ] }
					} )
					wsClient.addEventListener( "open", () => {
						wsClient.close()
						finishTest()
					}, { once: true } )
					wsClient.addEventListener( "error", ( error ) => {
						wsClient.close()
						finishTest( error )
					}, { once: true } )

				} )
			} )
		} )

	} )

} )
