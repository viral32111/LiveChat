// Import required third-party packages
import chai from "chai"

// Import required functions from the helper script
import { validateGuestName, validateRoomJoinCode, validateRoomName } from "../helpers/validation"

// Create a testing suite for testing input validation
suite( "Input Validation", () => {

	// Test input validation for guest names
	test( "Guest Name", () => {

		// These are good names
		chai.assert.isTrue( validateGuestName( "JohnSmith" ), "Expected guest name to be valid" )
		chai.assert.isTrue( validateGuestName( "John_Smith1" ), "Expected guest name to be valid" )
		chai.assert.isTrue( validateGuestName( "johnS" ), "Expected guest name to be valid" )

		// These are bad names
		chai.assert.isFalse( validateGuestName( "John-Smith" ), "Expected guest name to be invalid" )
		chai.assert.isFalse( validateGuestName( "John&Smith" ), "Expected guest name to be invalid" )
		chai.assert.isFalse( validateGuestName( "`John(Sm!th)`" ), "Expected guest name to be invalid" )
		chai.assert.isFalse( validateGuestName( "J" ), "Expected guest name to be invalid" )
		chai.assert.isFalse( validateGuestName( "JohnS JohnS JohnS JohnS JohnS JohnS" ), "Expected guest name to be invalid" )

	} )

	// Test input validation for the room names
	test( "Room Name", () => {

		// These are good room names
		chai.assert.isTrue( validateRoomName( "Lounge" ), "Expected room name to be valid" )
		chai.assert.isTrue( validateRoomName( "John's Place" ), "Expected room name to be valid" )
		chai.assert.isTrue( validateRoomName( "Example Room #1" ), "Expected room name to be valid" )

		// These are bad room names
		chai.assert.isFalse( validateRoomName( "`B4dR00mN4m3`" ), "Expected room name to be invalid" )
		chai.assert.isFalse( validateRoomName( "Room-Room-Room-Room-Room-Room-Room-Room-Room-Room-Room" ), "Expected room name to be invalid" )

	} )

	// Test input validation for the room join codes
	test( "Room Join Code", () => {

		// These are good room join codes
		chai.assert.isTrue( validateRoomJoinCode( "ABCDEF" ), "Expected room join codes to be valid" )
		chai.assert.isTrue( validateRoomJoinCode( "abcdef" ), "Expected room join codes to be valid" )
		chai.assert.isTrue( validateRoomJoinCode( "aBcDeF" ), "Expected room join codes to be valid" )

		// These are bad room join codes
		chai.assert.isFalse( validateRoomJoinCode( "AABB" ), "Expected room join codes to be invalid" )
		chai.assert.isFalse( validateRoomJoinCode( "wXyZ12" ), "Expected room join codes to be invalid" )
		chai.assert.isFalse( validateRoomJoinCode( "A B C D E F" ), "Expected room join codes to be invalid" )

	} )

} )
