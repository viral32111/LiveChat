// Import third-party packages
import chai, { expect } from "chai"
import chaiHTTP from "chai-http"
import chaiString from "chai-string"
import ws from "ws"

// Import code from other scripts
import { expressApp } from "../../main"
import MongoDB from "../../classes/mongodb"
import { readFileSync, rmSync, writeFileSync } from "fs"

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
		writeFileSync( "./test.txt", "Hello World!" ) // Create a file to test file uploads
	} )
	suiteTeardown( async () => {
		await MongoDB.PurgeGuests()
		await MongoDB.PurgeRooms()
		await MongoDB.PurgeMessages()
		await MongoDB.PurgeSessions()
		rmSync( "./test.txt" ) // Remove the file we created for testing file uploads
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
		chai.assert.deepEqual( chooseNameResponse2.body, { error: 0 }, "Expected HTTP response payload to contain invalid content type error code" )

		// Should fail when sending POST request without a name
		const chooseNameResponse3 = await chai.request( expressApp ).post( "/api/name" ).set( "content-type", "application/json" ).send( {} )
		chai.assert.equal( chooseNameResponse3.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
		chai.assert.containIgnoreCase( chooseNameResponse3.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse3.body, { error: 2 }, "Expected HTTP response payload to contain missing payload property error code" )

		// Should fail when sending a POST request with an invalid name
		const chooseNameResponse4 = await chai.request( expressApp ).post( "/api/name" ).set( "content-type", "application/json" ).send( { desiredName: "John&Smith" } )
		chai.assert.equal( chooseNameResponse4.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
		chai.assert.containIgnoreCase( chooseNameResponse4.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse4.body, { error: 3 }, "Expected HTTP response payload to contain malformed payload value error code" )

	} )

	// Test the check name API route
	test( "Check Name", async () => {

		// Should be null as no name has been chosen yet
		const checkNameResponse1 = await chai.request( expressApp ).get( "/api/name" )
		chai.assert.equal( checkNameResponse1.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( checkNameResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( checkNameResponse1.body, { name: null }, "Expected HTTP response payload to contain null" )

		// Create an agent to persist cookies/session state, then choose a name
		const userAgent = chai.request.agent( expressApp )
		const chooseNameResponse = await userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the name" )
		expect( chooseNameResponse ).to.have.cookie( "sessionIdentifier" )

		// Should succeed
		const checkNameResponse2 = await userAgent.get( "/api/name" )
		chai.assert.equal( checkNameResponse2.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( checkNameResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( checkNameResponse2.body, { name: "JohnSmith" }, "Expected HTTP response payload to contain the name" )

	} )

	// Test the create new room API route
	test( "Create New Room", async () => {

		// Should fail as no name has been chosen yet
		const createRoomResponse1 = await chai.request( expressApp ).post( "/api/room" ).send( { name: "John's Room" } )
		chai.assert.equal( createRoomResponse1.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
		chai.assert.containIgnoreCase( createRoomResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( createRoomResponse1.body, { error: 6 }, "Expected HTTP response payload to contain name not chosen error code" )

		// Create an agent to persist cookies/session state, then choose a name
		const userAgent = chai.request.agent( expressApp )
		const chooseNameResponse = await userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
		expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

		// Should succeed
		const createRoomResponse2 = await userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } )
		chai.assert.equal( createRoomResponse2.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( createRoomResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllDeepKeys( createRoomResponse2.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.equal( createRoomResponse2.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
		chai.assert.equal( createRoomResponse2.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
		chai.assert.lengthOf( createRoomResponse2.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

	} )

	// Test the get public rooms API route
	test( "Get Public Rooms", async () => {

		// Should fail as no name has been chosen
		const getRoomsResponse1 = await chai.request( expressApp ).get( "/api/rooms" )
		chai.assert.equal( getRoomsResponse1.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
		chai.assert.containIgnoreCase( getRoomsResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( getRoomsResponse1.body, { error: 6 }, "Expected HTTP response payload to contain name not chosen error code" )

		// Create an agent to persist cookies/session state, then choose a name
		const userAgent = chai.request.agent( expressApp )
		const chooseNameResponse = await userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
		expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

		// Should succeed with 0 rooms
		const getRoomsResponse2 = await userAgent.get( "/api/rooms" )
		chai.assert.equal( getRoomsResponse2.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( getRoomsResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( getRoomsResponse2.body, { publicRooms: [] }, "Expected HTTP response payload to contain an array" )
		chai.assert.lengthOf( getRoomsResponse2.body.publicRooms, 0, "Expected HTTP response payload to contain an empty array" )

		// Create a room
		const createRoomResponse = await userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } )
		chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
		chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
		chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

		// Should suceed with 1 room
		const getRoomsResponse3 = await userAgent.get( "/api/rooms" )
		chai.assert.equal( getRoomsResponse3.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( getRoomsResponse3.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllKeys( getRoomsResponse3.body, [ "publicRooms" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.typeOf( getRoomsResponse3.body.publicRooms, "array", "Expected HTTP response payload publicRooms property to be an array" )
		chai.assert.lengthOf( getRoomsResponse3.body.publicRooms, 1, "Expected HTTP response payload publicRooms property to contain 1 item" )

	} )

	// Test the join room API route
	test( "Join Room", async () => {

		// Should fail as no name has been chosen
		const joinRoomResponse1 = await chai.request( expressApp ).get( "/api/room/aabbcc" )
		chai.assert.equal( joinRoomResponse1.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
		chai.assert.containIgnoreCase( joinRoomResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( joinRoomResponse1.body, { error: 6 }, "Expected HTTP response payload to contain name not chosen error code" )

		// Create an agent to persist cookies/session state, then choose a name
		const userAgent = chai.request.agent( expressApp )
		const chooseNameResponse = await userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
		expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

		// Should fail as there is no room with this join code
		const joinRoomResponse2 = await userAgent.get( "/api/room/aabbcc" )
		chai.assert.equal( joinRoomResponse2.status, 500, "Expected HTTP response status code to be 500 Internal Server Error" )
		chai.assert.containIgnoreCase( joinRoomResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( joinRoomResponse2.body, { error: 9 }, "Expected HTTP response payload to contain database find failure error code" )

		// Create a room
		const createRoomResponse = await userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } )
		chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
		chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
		chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

		// Should succeed
		const joinRoomResponse3 = await userAgent.get( `/api/room/${ createRoomResponse.body.joinCode }` )
		chai.assert.equal( joinRoomResponse3.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( joinRoomResponse3.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( joinRoomResponse3.body, { code: createRoomResponse.body.joinCode }, "Expected HTTP response payload to contain the room join code" )

	} )

	// Test the get room data API route
	test( "Get Room Data", async () => {

		// Should fail as no name has been chosen
		const roomDataResponse1 = await chai.request( expressApp ).get( "/api/room" )
		chai.assert.equal( roomDataResponse1.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
		chai.assert.containIgnoreCase( roomDataResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( roomDataResponse1.body, { error: 6 }, "Expected HTTP response payload to contain name not chosen error code" )

		// Create an agent to persist cookies/session state, then choose a name
		const userAgent = chai.request.agent( expressApp )
		const chooseNameResponse = await userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
		expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

		// Should be null as no room has been chosen
		const roomDataResponse2 = await userAgent.get( "/api/room" )
		chai.assert.equal( roomDataResponse2.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( roomDataResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( roomDataResponse2.body, { room: null }, "Expected HTTP response payload to contain null room" )

		// Create a room
		const createRoomResponse = await userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } )
		chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
		chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
		chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

		const joinRoomResponse = await userAgent.get( `/api/room/${ createRoomResponse.body.joinCode }` )
		chai.assert.equal( joinRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( joinRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( joinRoomResponse.body, { code: createRoomResponse.body.joinCode }, "Expected HTTP response payload to contain the room join code" )

		// Should contain room data
		const roomDataResponse3 = await userAgent.get( "/api/room" )
		chai.assert.equal( roomDataResponse3.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( roomDataResponse3.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllDeepKeys( roomDataResponse3.body, [ "room" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.hasAllDeepKeys( roomDataResponse3.body.room, [ "name", "isPrivate", "joinCode", "guests", "messages" ], "Expected HTTP response room payload to contain all required keys" )
		chai.assert.equal( roomDataResponse3.body.room.name, "John's Room", "Expected HTTP response room payload name property to be the room name" )
		chai.assert.equal( roomDataResponse3.body.room.isPrivate, false, "Expected HTTP response room payload isPrivate property to be false" )
		chai.assert.equal( roomDataResponse3.body.room.joinCode, createRoomResponse.body.joinCode, "Expected HTTP response room payload joinCode property to be the room join code" )
		chai.assert.typeOf( roomDataResponse3.body.room.guests, "array", "Expected HTTP response room payload guests property to be an array" )
		chai.assert.typeOf( roomDataResponse3.body.room.messages, "array", "Expected HTTP response room payload messages property to be an array" )

	} )

	// Test the end session API route
	test( "End Session", async () => {

		// Should fail as no name has been chosen
		const endSessionResponse1 = await chai.request( expressApp ).delete( "/api/session" )
		chai.assert.equal( endSessionResponse1.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
		chai.assert.containIgnoreCase( endSessionResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( endSessionResponse1.body, { error: 6 }, "Expected HTTP response payload to contain name not chosen error code" )

		// Create an agent to persist cookies/session state, then choose a name
		const userAgent = chai.request.agent( expressApp )
		const chooseNameResponse = await userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
		expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

		// Should succeed
		const endSessionResponse2 = await userAgent.delete( "/api/session" )
		chai.assert.equal( endSessionResponse2.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( endSessionResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( endSessionResponse2.body, {}, "Expected HTTP response payload to be empty" )

	} )

	// Test the upload file API route
	test( "Upload File", async () => {

		// Should fail as no name has been chosen
		const uploadFileResponse1 = await chai.request( expressApp ).put( "/api/upload" )
		chai.assert.equal( uploadFileResponse1.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
		chai.assert.containIgnoreCase( uploadFileResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( uploadFileResponse1.body, { error: 6 }, "Expected HTTP response payload to contain name not chosen error code" )

		// Create an agent to persist cookies/session state, then choose a name
		const userAgent = chai.request.agent( expressApp )
		const chooseNameResponse = await userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
		expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

		// Should fail as no room has been chosen
		const uploadFileResponse2 = await userAgent.put( "/api/upload" )
		chai.assert.equal( uploadFileResponse2.status, 403, "Expected HTTP response status code to be 403 Forbidden" )
		chai.assert.containIgnoreCase( uploadFileResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( uploadFileResponse2.body, { error: 11 }, "Expected HTTP response payload to contain room not joined error code" )

		// Create a room
		const createRoomResponse = await userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } )
		chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
		chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
		chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

		// Join the room
		const joinRoomResponse = await userAgent.get( `/api/room/${ createRoomResponse.body.joinCode }` )
		chai.assert.equal( joinRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( joinRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( joinRoomResponse.body, { code: createRoomResponse.body.joinCode }, "Expected HTTP response payload to contain the room join code" )

		// Should fail as no content type has been specified
		const uploadFileResponse3 = await userAgent.put( "/api/upload" )
		chai.assert.equal( uploadFileResponse3.status, 400, "Expected HTTP response status code to be 400 Bad Request" )
		chai.assert.containIgnoreCase( uploadFileResponse3.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( uploadFileResponse3.body, { error: 0 }, "Expected HTTP response payload to contain invalid content type error code" )

		// Should succeed
		const uploadFileResponse4 = await userAgent.put( "/api/upload" ).set( "content-type", "multipart/form-data" ).attach( "1", readFileSync( "./test.txt" ), "test.txt" )
		chai.assert.equal( uploadFileResponse4.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( uploadFileResponse4.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllDeepKeys( uploadFileResponse4.body, [ "files" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.typeOf( uploadFileResponse4.body.files, "array", "Expected HTTP response payload files property to be an array" )
		chai.assert.lengthOf( uploadFileResponse4.body.files, 1, "Expected HTTP response payload files property to contain 1 item" )

	} )

	// Test the upgrade to WebSocket connection API route
	test( "Upgrade to WebSocket Connection", async () => {

		// Should fail as no name has been chosen
		const upgradeToWebSocketResponse1 = await chai.request( expressApp ).get( "/api/chat" )
		chai.assert.equal( upgradeToWebSocketResponse1.status, 401, "Expected HTTP response status code to be 401 Unauthorized" )
		chai.assert.containIgnoreCase( upgradeToWebSocketResponse1.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( upgradeToWebSocketResponse1.body, { error: 6 }, "Expected HTTP response payload to contain name not chosen error code" )

		// Create an agent to persist cookies/session state, then choose a name
		const userAgent = chai.request.agent( expressApp )
		const chooseNameResponse = await userAgent.post( "/api/name" ).send( { desiredName: "JohnSmith" } )
		chai.assert.equal( chooseNameResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( chooseNameResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( chooseNameResponse.body, { chosenName: "JohnSmith" }, "Expected HTTP response payload to contain the guest name" )
		expect( chooseNameResponse, "Expected HTTP response to set a session identifier cookie" ).to.have.cookie( "sessionIdentifier" )

		// Should fail as no room has been chosen
		const upgradeToWebSocketResponse2 = await userAgent.get( "/api/chat" )
		chai.assert.equal( upgradeToWebSocketResponse2.status, 403, "Expected HTTP response status code to be 403 Forbidden" )
		chai.assert.containIgnoreCase( upgradeToWebSocketResponse2.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( upgradeToWebSocketResponse2.body, { error: 11 }, "Expected HTTP response payload to contain room not joined error code" )

		// Create a room
		const createRoomResponse = await userAgent.post( "/api/room" ).send( { name: "John's Room", isPrivate: false } )
		chai.assert.equal( createRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( createRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.hasAllDeepKeys( createRoomResponse.body, [ "name", "isPrivate", "joinCode" ], "Expected HTTP response payload to contain all required keys" )
		chai.assert.equal( createRoomResponse.body.name, "John's Room", "Expected HTTP response payload name property to be the room name" )
		chai.assert.equal( createRoomResponse.body.isPrivate, false, "Expected HTTP response payload isPrivate property to be false" )
		chai.assert.lengthOf( createRoomResponse.body.joinCode, 6, "Expected HTTP response payload joinCode property to be 6 characters" )

		// Join the room
		const joinRoomResponse = await userAgent.get( `/api/room/${ createRoomResponse.body.joinCode }` )
		chai.assert.equal( joinRoomResponse.status, 200, "Expected HTTP response status code to be 200 OK" )
		chai.assert.containIgnoreCase( joinRoomResponse.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( joinRoomResponse.body, { code: createRoomResponse.body.joinCode }, "Expected HTTP response payload to contain the room join code" )

		// Should fail as WebSocket upgrade headers are not present
		const upgradeToWebSocketResponse3 = await userAgent.get( "/api/chat" )
		chai.assert.equal( upgradeToWebSocketResponse3.status, 426, "Expected HTTP response status code to be 426 Upgrade Required" )
		chai.assert.containIgnoreCase( upgradeToWebSocketResponse3.header[ "content-type" ], "application/json", "Expected HTTP response content type to be JSON" )
		chai.assert.deepEqual( upgradeToWebSocketResponse3.body, { error: 10 }, "Expected HTTP response payload to contain must upgrade to WebSocket error code" )

		// Should succeed - https://medium.com/geekculture/test-a-websocket-f1156e0e3215
		await new Promise<void>( ( resolve, reject ) => {
			const wsClient = new ws.WebSocket( "ws://127.0.0.1:5000/api/chat", {
				headers: { "Cookie": chooseNameResponse.header[ "set-cookie" ][ 0 ].split( ";" )[ 0 ] }
			} )
			wsClient.addEventListener( "open", () => {
				wsClient.close()
				resolve()
			}, { once: true } )
			wsClient.addEventListener( "error", ( error ) => {
				wsClient.close()
				reject( error )
			}, { once: true } )
		} )

	} )

} )
