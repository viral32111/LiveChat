// Import required third-party packages
import { MongoClient, Db, ObjectId, WithId, Document, Filter } from "mongodb"
import { getLogger } from "log4js"

// Import required functions from helper scripts
import { generateRoomJoinCode } from "./helpers/random"

// Create the logger for this file
const log = getLogger( "mongodb" )

interface Guest extends WithId<Document> {
	name: string
}

interface Room extends WithId<Document> {
	name: string
	isPrivate: boolean,
	participantCount: number,
	joinCode: string
}

interface Message extends WithId<Document> {
	content: string
	sentAt: Date,
	guestName: string,
	attachments: string[],
	roomId: ObjectId
}

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
		log.info( "Connected to MongoDB." )
	}
	public static async Disconnect() {
		await MongoDB.Client.close()
		log.info( "Disconnected from MongoDB." )
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

		log.debug( `Inserted new guest '${ name }' with ID: ${ insertResult.insertedId }.` )

		return insertResult
	}

	// Gets a list of the rooms in the database
	public static async GetRooms( filter: Filter<Room> = {} ) {
		const foundRooms = await MongoDB.Database.collection<Room>( MongoDB.CollectionNames.Rooms ).find<Room>( filter ).toArray()
		log.debug( `Found ${ foundRooms.length } rooms using filter '${ JSON.stringify( filter ) }'.` )

		return foundRooms
	}

	// Gets a list of the messages in the database
	public static async GetMessages( roomId: ObjectId | undefined = undefined ) {
		const foundMessages = await MongoDB.Database.collection<Message>( MongoDB.CollectionNames.Messages )
			.find<Message>( roomId === undefined ? {} : { roomId: roomId } )
			.sort( { sentAt: -1 } ) // Newest messages first
			.project<Message>( { _id: 0 } ) // removes _id from the results - https://stackoverflow.com/a/52250461
			.toArray()

		log.debug( `Found ${ foundMessages.length } messages for room '${ roomId }'.` )

		return foundMessages
	}

	// Creates a new room in the database
	public static async CreateRoom( name: string, isPrivate: boolean ) {
		const insertResult = await MongoDB.Database.collection<Room>( MongoDB.CollectionNames.Rooms ).insertOne( {
			_id: new ObjectId(), // This shuts TypeScript up about the _id not being set
			name: name,
			isPrivate: isPrivate,
			participantCount: 0,
			joinCode: generateRoomJoinCode()
		} )

		log.debug( `Inserted new room '${ name }' with ID: ${ insertResult.insertedId }.` )

		return insertResult
	}

	// Remove a guest from the database
	public static async RemoveGuest( guestId: ObjectId ) {
		const deleteResult = await MongoDB.Database.collection( MongoDB.CollectionNames.Guests ).deleteOne( {
			_id: guestId
		} )

		log.debug( `Deleted guest '${ guestId }'.` )

		return deleteResult
	}

	// Get a guest from the database
	public static async GetGuests( filter: Filter<Guest> = {} ) {
		const foundGuests = await MongoDB.Database.collection<Guest>( MongoDB.CollectionNames.Guests ).find( filter ).toArray()
		log.debug( `Found ${ foundGuests.length } guests using filter '${ JSON.stringify( filter ) }'.` )
		return foundGuests
	}

	// Remove all guests from the database
	public static async PurgeGuests() {
		const deleteResult = await MongoDB.Database.collection<Guest>( MongoDB.CollectionNames.Guests ).deleteMany( {} )
		log.debug( `Removed ${ deleteResult.deletedCount } guests.` )
		return deleteResult
	}

	// Remove all rooms from the database
	public static async PurgeRooms() {
		const deleteResult = await MongoDB.Database.collection<Room>( MongoDB.CollectionNames.Rooms ).deleteMany( {} )
		log.debug( `Removed ${ deleteResult.deletedCount } rooms.` )
		return deleteResult
	}

	// Remove all Express sessiobs from the database
	public static async PurgeSessions() {
		const deleteResult = await MongoDB.Database.collection( MongoDB.CollectionNames.Sessions ).deleteMany( {} )
		log.debug( `Removed ${ deleteResult.deletedCount } sessions.` )
		return deleteResult
	}

}
