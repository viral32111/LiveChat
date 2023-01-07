// Import required native packages
import { randomUUID } from "crypto"

// Helper function to generate a random string of a given length using the given characters
export function generateRandomString( length: number, characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" ) {
	let randomString = ""
	for ( let i = 0; i < length; i++ ) randomString += characters.charAt( Math.floor( Math.random() * characters.length ) )
	return randomString
}

// Helper function to generate a random room join code
export const generateRoomJoinCode = () => generateRandomString( 6, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" )

// Helper function to generate a universally unique identifier
export const generateUUID = () => randomUUID().replaceAll( "-", "" )
