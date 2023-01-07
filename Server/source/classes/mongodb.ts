// Import third-party packages
import { MongoClient, Db, ObjectId, WithId, Document, Filter } from "mongodb"
import { getLogger } from "log4js"

// Import functions from helper scripts
import { generateRoomJoinCode } from "../helpers/random"
import { Attachment } from "../interfaces/routes/responses"

// Create the logger for this file
const log = getLogger( "mongodb" )

// Guest documents
interface Guest extends WithId<Document> {
	name: string,
	inRoom: ObjectId | null,
	joinedAt: Date
}

// Room documents
interface Room extends WithId<Document> {
	name: string
	isPrivate: boolean,
	joinCode: string,
	createdAt: Date,
	createdBy: ObjectId
}

// Message documents
interface Message extends WithId<Document> {
	content: string
	attachments: Attachment[],
	sentAt: Date,
	sentBy: ObjectId,
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

	/**** Guests ****/

	// Creates a new guest in the database
	public static async AddGuest( name: string ) {
		const insertResult = await MongoDB.Database.collection<Guest>( MongoDB.CollectionNames.Guests ).insertOne( {
			_id: new ObjectId(),
			name: name,
			inRoom: null,
			joinedAt: new Date()
		} )
		log.debug( `Inserted guest '${ name }' (${ insertResult.insertedId }).` )
		return insertResult
	}

	// Removes an existing guest from the database
	public static async RemoveGuest( guestId: ObjectId ) {
		const deleteResult = await MongoDB.Database.collection<Guest>( MongoDB.CollectionNames.Guests ).deleteOne( {
			_id: new ObjectId( guestId )
		} )
		log.debug( `Deleted guest '${ guestId }'.` )
		return deleteResult
	}

	// Updates an existing guest in the database
	public static async UpdateGuest( guestId: ObjectId, update: Partial<Guest> ) {
		const updateResult = await MongoDB.Database.collection<Guest>( MongoDB.CollectionNames.Guests ).updateOne( {
			_id: new ObjectId( guestId )
		}, {
			$set: update
		} )
		log.debug( `Updated guest '${ guestId }' with '${ JSON.stringify( update ) }'.` )
		return updateResult
	}

	// Gets one or more guests from the database
	public static async GetGuests( filter: Filter<Guest> = {} ) {
		const findResult = await MongoDB.Database.collection<Guest>( MongoDB.CollectionNames.Guests ).find( filter ).toArray()
		log.debug( `Found ${ findResult.length } guests using filter '${ JSON.stringify( filter ) }'.` )
		return findResult
	}

	// Removes all guests from the database
	public static async PurgeGuests() {
		const deleteResult = await MongoDB.Database.collection<Guest>( MongoDB.CollectionNames.Guests ).deleteMany( {} )
		log.debug( `Removed ${ deleteResult.deletedCount } guests.` )
		return deleteResult
	}

	/**** Rooms ****/

	// Creates a new room in the database
	public static async AddRoom( name: string, isPrivate: boolean, createdBy: ObjectId ) {
		const insertResult = await MongoDB.Database.collection<Room>( MongoDB.CollectionNames.Rooms ).insertOne( {
			_id: new ObjectId(), // This shuts TypeScript up about the _id not being set
			name: name,
			isPrivate: isPrivate,
			joinCode: generateRoomJoinCode(),
			createdAt: new Date(),
			createdBy: new ObjectId( createdBy )
		} )
		log.debug( `Inserted room '${ name }' (${ insertResult.insertedId }).` )
		return insertResult
	}

	// Removes an existing room from the database
	public static async RemoveRoom( roomId: ObjectId ) {
		const deleteResult = await MongoDB.Database.collection<Room>( MongoDB.CollectionNames.Rooms ).deleteOne( {
			_id: new ObjectId( roomId )
		} )
		log.debug( `Deleted room '${ roomId }'.` )
		return deleteResult
	}

	// Gets one or more rooms from the database
	public static async GetRooms( filter: Filter<Room> = {} ) {
		const findResult = await MongoDB.Database.collection<Room>( MongoDB.CollectionNames.Rooms ).find<Room>( filter ).toArray()
		log.debug( `Found ${ findResult.length } rooms using filter '${ JSON.stringify( filter ) }'.` )
		return findResult
	}

	// Removes all rooms from the database
	public static async PurgeRooms() {
		const deleteResult = await MongoDB.Database.collection<Room>( MongoDB.CollectionNames.Rooms ).deleteMany( {} )
		log.debug( `Removed ${ deleteResult.deletedCount } rooms.` )
		return deleteResult
	}

	/**** Messages ****/

	// Creates a message in the database
	public static async AddMessage( content: string, attachments: Attachment[], sentBy: ObjectId, roomId: ObjectId ) {
		const insertResult = await MongoDB.Database.collection<Message>( MongoDB.CollectionNames.Messages ).insertOne( {
			_id: new ObjectId(),
			content: content,
			attachments: attachments,
			sentAt: new Date(),
			sentBy: new ObjectId( sentBy ),
			roomId: new ObjectId( roomId )
		} )
		log.debug( `Inserted message '${ content }' (${ insertResult.insertedId }).` )
		return ( await this.GetMessages( { _id: insertResult.insertedId } ) )[ 0 ]
	}

	// Removes one or more existing messages from the database
	public static async RemoveMessages( filter: Filter<Message> ) {
		const deleteResult = await MongoDB.Database.collection<Message>( MongoDB.CollectionNames.Messages ).deleteMany( filter )
		log.debug( `Deleted ${ deleteResult.deletedCount } messages using filter '${ JSON.stringify( filter ) }'.` )
		return deleteResult
	}

	// Gets one or more messages from the database
	public static async GetMessages( filter: Filter<Message> = {} ) {
		const findResult = await MongoDB.Database.collection<Message>( MongoDB.CollectionNames.Messages )
			.find<Message>( filter )
			.sort( { sentAt: 1 } ) // Newest messages first
			.toArray()
		log.debug( `Found ${ findResult.length } messages using filter '${ JSON.stringify( filter ) }'.` )
		return findResult
	}

	/**** Sessions ****/

	// Removes all Express sessiobs from the database
	public static async PurgeSessions() {
		const deleteResult = await MongoDB.Database.collection( MongoDB.CollectionNames.Sessions ).deleteMany( {} )
		log.debug( `Removed ${ deleteResult.deletedCount } sessions.` )
		return deleteResult
	}

}
