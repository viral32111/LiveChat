// Import required classes from the MongoDB package
import { MongoClient, Db } from "mongodb"

// Static class to encapsulate all our MongoDB functionality
export default class MongoDB {

	// Properties to store the client & database
	public static Client: MongoClient
	public static Database: Db

	// Private property to store names of collections in the database
	private static CollectionNames = {
		Guests: "Guests",
		Rooms: "Rooms",
		Messages: "Messages"
	}

	// Initialises the client & database
	public static Initialise() {

		// Fail if any of the required environment variables are not set
		if ( !process.env.MONGO_HOST ) throw new Error( "The MONGO_HOST environment variable is not set" )
		if ( !process.env.MONGO_DATABASE ) throw new Error( "The MONGO_DATABASE environment variable is not set" )
		if ( !process.env.MONGO_USER_NAME ) throw new Error( "The MONGO_USER_NAME environment variable is not set" )
		if ( !process.env.MONGO_USER_PASS ) throw new Error( "The MONGO_USER_PASS environment variable is not set" )

		// Assign the environment variables to constants for easier access
		const MONGO_HOST = process.env.MONGO_HOST
		const MONGO_DATABASE = process.env.MONGO_DATABASE
		const MONGO_USER_NAME = process.env.MONGO_USER_NAME
		const MONGO_USER_PASS = process.env.MONGO_USER_PASS

		// Initialise the client & fetch the database
		MongoDB.Client = new MongoClient( `mongodb+srv://${ MONGO_USER_NAME }:${ MONGO_USER_PASS }@${ MONGO_HOST }/${ MONGO_DATABASE }?retryWrites=true&w=majority` )
		MongoDB.Database = MongoDB.Client.db( MONGO_DATABASE )

	}

	// Connects to & disconnects
	public static async Connect() { await MongoDB.Client.connect() }
	public static async Disconnect() { await MongoDB.Client.close() }

	// Checks the connection
	public static async Ping() { await MongoDB.Database.command( { ping: 1 } ) }

	// Adds a guest to the database
	public static async AddGuest( name: string ) {
		await MongoDB.Database.collection( MongoDB.CollectionNames.Guests ).insertOne( {
			name: name
		} )
	}

}
