// Import required third-party packages
import chai from "chai"

// Import required functions from the helper script
import { generateRandomString, generateRoomJoinCode, generateUUID } from "../../helpers/random"

// Create a testing suite for testing the random functions
suite( "Unit - Random", () => {

	// Test generating random strings
	test( "String", () => {
		chai.assert.lengthOf( generateRandomString( 10 ), 10, "Expected string to be 10 characters." )
		chai.assert.equal( generateRandomString( 5, "A" ), "AAAAA", "Expected string to be 5 A's." )
	} )

	// Test generating room join codes
	test( "Room Join Code", () => {
		chai.assert.lengthOf( generateRoomJoinCode(), 6, "Expected room join code to be 6 characters." )
		chai.assert.notInclude( generateRoomJoinCode(), "1234567890", "Expected room join code to not contain numbers." )
	} )

	// Test generating UUIDs
	test( "UUID", () => {
		chai.assert.lengthOf( generateUUID(), 32, "Expected UUID to be 32 characters." )
		chai.assert.notInclude( generateUUID(), "-", "Expected UUID to not contain hyphens." )
	} )

} )
