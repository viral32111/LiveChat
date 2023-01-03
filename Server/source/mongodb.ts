// Import third-party packages
import { MongoClient } from "mongodb"

// Fail if any of the required environment variables are not set
if ( !process.env.MONGO_HOST ) throw new Error( "The MONGO_HOST environment variable is not set" )
if ( !process.env.MONGO_PORT ) throw new Error( "The MONGO_PORT environment variable is not set" )
if ( !process.env.MONGO_DATABASE ) throw new Error( "The MONGO_DATABASE environment variable is not set" )
if ( !process.env.MONGO_USER_NAME ) throw new Error( "The MONGO_USER_NAME environment variable is not set" )
if ( !process.env.MONGO_USER_PASS ) throw new Error( "The MONGO_USER_PASS environment variable is not set" )

// Assign the environment variables to constants for easier access
const MONGO_HOST = process.env.MONGO_HOST
const MONGO_PORT = parseInt( process.env.MONGO_PORT )
const MONGO_DATABASE = process.env.MONGO_DATABASE
const MONGO_USER_NAME = process.env.MONGO_USER_NAME
const MONGO_USER_PASS = process.env.MONGO_USER_PASS

// TODO: Make custom class for all MongoDB operations

// Create a new MongoDB client
const mongoClient = new MongoClient( `mongodb+srv://${ MONGO_USER_NAME }:${ MONGO_USER_PASS }@${ MONGO_HOST }:${ MONGO_PORT }/${ MONGO_DATABASE }` )

export async function mongoAddGuest( name: string ) {
	try {
		await mongoClient.connect()
		const mongoDatabase = mongoClient.db( MONGO_DATABASE )
		console.debug( "Connected to MongoDB" )
	
		const guestCollection = mongoDatabase.collection( "Guests" )
		const insertResult = await guestCollection.insertOne( {
			name: name
		} )
	
		console.debug( "Inserted guest into MongoDB:", insertResult.insertedId )
	
		await mongoClient.close()
		console.debug( "Disconnected from MongoDB" )
	} catch ( error ) {
		console.error( "mongoAddGuest:", error )
	}
}
