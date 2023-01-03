// Import required third-party packages
import { MongoClient, Db } from "mongodb"
import { getLogger } from "log4js"

// Create the logger for this file
const log = getLogger( "mongodb" )

// Static class to encapsulate all our MongoDB functionality
export default class MongoDB {

	// Stores the client & database
	public static Client: MongoClient
	public static Database: Db

	// Stores names of collections in the database
	public static CollectionNames = {
		Guests: "Guests",
		Rooms: "Rooms",
		Messages: "Messages",
		Sessions: "Sessions"
	}

	// Initialises the client & database
	public static Initialise() {

		// Fail if the required environment variables are not set & assign them to constants for easier access
		if ( !process.env.MONGO_HOST ) throw new Error( "The MONGO_HOST environment variable is not set" )
		if ( !process.env.MONGO_DATABASE ) throw new Error( "The MONGO_DATABASE environment variable is not set" )
		if ( !process.env.MONGO_USER_NAME ) throw new Error( "The MONGO_USER_NAME environment variable is not set" )
		if ( !process.env.MONGO_USER_PASS ) throw new Error( "The MONGO_USER_PASS environment variable is not set" )
		const MONGO_HOST = process.env.MONGO_HOST
		const MONGO_DATABASE = process.env.MONGO_DATABASE
		const MONGO_USER_NAME = process.env.MONGO_USER_NAME
		const MONGO_USER_PASS = process.env.MONGO_USER_PASS

		// Initialise the client & fetch the database
		MongoDB.Client = new MongoClient( `mongodb+srv://${ MONGO_USER_NAME }:${ MONGO_USER_PASS }@${ MONGO_HOST }/${ MONGO_DATABASE }?retryWrites=true&w=majority` )
		MongoDB.Database = MongoDB.Client.db( MONGO_DATABASE )
		log.info( "Initialised MongoDB." )

	}

	// Connects to & disconnects from the database
	public static async Connect() {
		await MongoDB.Client.connect()
		log.info( "Connected to the database." )
	}
	public static async Disconnect() {
		await MongoDB.Client.close()
		log.info( "Disconnected from the database." )
	}

	// Checks the connection
	public static async Ping() {
		await MongoDB.Database.command( { ping: 1 } )
		log.debug( "Database ping successful." )
	}

	// Adds a guest to the database
	public static async AddGuest( name: string ) {
		const insertResult = await MongoDB.Database.collection( MongoDB.CollectionNames.Guests ).insertOne( {
			name: name
		} )
		log.debug( `Inserted new document with ID: ${ insertResult.insertedId }.` )
	}

}
