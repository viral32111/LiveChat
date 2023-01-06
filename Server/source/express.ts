// Import required native packages
import { parse } from "path"

// Import required third-party packages
import express from "express"
import expressSession from "express-session"
import MongoStore from "connect-mongo"
import { getLogger } from "log4js"
import { ObjectId } from "mongodb"
import multer from "multer"

// Import required code from other scripts
import { isProduction, isTest } from "./main"
import { generateUUID } from "./helpers/random"
import MongoDB from "./mongodb"

// Create the logger for this file
const log = getLogger( "express" )

// Extend the Express session data interface to include our properties
declare module "express-session" {
	interface SessionData {
		guestId: ObjectId
		roomId: ObjectId
	}
}

// Sets up a new Express application
export default function() {

	// Fail if the required environment variables are not set & assign them to constants for easier access
	if ( !process.env.HTTP_SERVER_ADDRESS ) throw new Error( "The HTTP_SERVER_ADDRESS environment variable is not set" )
	if ( !process.env.EXPRESS_SESSION_SECRET ) throw new Error( "The EXPRESS_SESSION_SECRET environment variable is not set" )
	const HTTP_SERVER_ADDRESS = process.env.HTTP_SERVER_ADDRESS
	const EXPRESS_SESSION_SECRET = process.env.EXPRESS_SESSION_SECRET

	// Create a new Express application
	const expressApp = express()
	log.info( "Initialised the Express app." )

	// Add support for various middlewares for the Express application
	expressApp.use( express.json() )
	expressApp.use( expressSession( {
		name: "sessionIdentifier",
		secret: EXPRESS_SESSION_SECRET,
		resave: true,
		saveUninitialized: false,
		store: ( isProduction === true || isTest === true ) ? MongoStore.create( {
			client: MongoDB.Client,
			collectionName: MongoDB.CollectionNames.Sessions,
		} ) : undefined, // Falling back to undefined will use the default in-memory store
		cookie: {
			domain: HTTP_SERVER_ADDRESS,
			httpOnly: true,
			secure: isProduction,
			sameSite: "strict"
		}
	} ) )
	log.info( "Setup Express middlewares." )

	// Log all incoming requests & their responses
	expressApp.use( ( request, response, next ) => {
		response.on( "finish", () => {
			log.debug( `${ request.method } ${ request.path } ${ JSON.stringify( request.body ) } => ${ response.statusCode }` )
		} )
		next()
	} )

	// Serve the client-side files
	expressApp.use( express.static( "../Client/" ) )
	log.info( "Setup serving the client-side files." )

	// Return the Express app for use in other scripts
	return expressApp

}

// https://github.com/expressjs/multer#api
export const multerMiddleware = multer( {
	limits: {
		files: 5, // Amount of files
		parts: 5, // Same as above
		fieldNameSize: 100, // Length of each field name
		fileSize: 1024 * 1024 * 10, // Size of each file (10 MiB)
		fieldSize: 1024 * 1024 * 10, // Same as above
	},
	storage: multer.diskStorage( {
		destination: ( _, file, callback ) => {
			log.debug( "setting destination for:", file.fieldname, file.originalname, file.encoding, file.mimetype, file.size, file.path, file.buffer, file.buffer?.byteLength )
			callback( null, "../Client/attachments/" ) // TODO: Ensure this directory exists
		},
		filename: ( _, file, callback ) => {
			log.debug( "making file name for:", file.fieldname, file.originalname, file.encoding, file.mimetype, file.size, file.path, file.buffer, file.buffer?.byteLength )

			/*log.debug( "reading file:", file.path )
			readFile( file.path, ( error, data ) => {
				log.debug( "read file:", file.path, ", size is:", data.byteLength )

				if ( error ) throw error

				const hash = createHash( "sha256" )
				log.debug( "created sha256 hasher" )

				hash.update( data )
				log.debug( "put file buffer into hasher" )

				const fileName = hash.digest( "hex" ).concat( parse( file.originalname ).ext )
				log.debug( "file name is now:", fileName )

				callback( null, fileName )
			} )*/

			const fileName = generateUUID().concat( parse( file.originalname ).ext )
			log.debug( "file name is now:", fileName )

			callback( null, fileName )
		}
	} ),
	fileFilter: ( request, file, callback ) => {
		log.debug( "filtering file:", file.fieldname, file.originalname, file.encoding, file.mimetype, file.size, file.path, file.buffer, file.buffer?.byteLength )

		// allow everything for now
		callback( null, true )
	}
} )
