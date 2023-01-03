// Import required third-party packages
import chai from "chai"
import { validateChosenName } from "../helpers/validation"

// Create a testing suite for testing input validation
suite( "Input Validation", () => {

	// Test input validation for chosen name
	test( () => {

		// These are good names
		chai.assert.isTrue( validateChosenName( "JohnSmith" ) )
		chai.assert.isTrue( validateChosenName( "John_Smith1" ) )
		chai.assert.isTrue( validateChosenName( "johnS" ) )

		// These are bad names
		chai.assert.isFalse( validateChosenName( "John-Smith" ) )
		chai.assert.isFalse( validateChosenName( "John&Smith" ) )
		chai.assert.isFalse( validateChosenName( "`John(Sm!th)`" ) )

	} )

} )
