// Import required third-party packages
import express from "express"
import expressSession from "express-session"
import MongoStore from "connect-mongo"
import { getLogger } from "log4js"

// Import required data from other scripts
import { isProduction } from "./main"
import MongoDB from "./mongodb"

// Create the logger for this file
const log = getLogger( "express" )

// Extend the Express session data interface to include our properties
declare module "express-session" {
	interface SessionData {
		chosenName: string
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
		store: isProduction ? MongoStore.create( {
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

	// Import routes from other scripts
	import( "./routes/name" )
	log.info( "Loaded all API routes." )

	// Return the Express app for use in other scripts
	return expressApp

}
