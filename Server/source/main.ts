// Import required third-party packages
import * as dotenv from "dotenv"
import express from "express"
import expressSession from "express-session"
import MongoStore from "connect-mongo"
import MongoDB from "./mongodb"
import { configure, getLogger } from "log4js"

// Are we running in production mode?
export const isProduction = process.env.NODE_ENV === "production"

// Configure the logger library
configure( {
	appenders: { console: { type: "stdout" } },
	categories: {
		"default": { appenders: [ "console" ], level: isProduction ? "info" : "trace" },
		"main": { appenders: [ "console" ], level: isProduction ? "info" : "trace" },
		"routes/name": { appenders: [ "console" ], level: isProduction ? "info" : "trace" },
		"tests/routes": { appenders: [ "console" ], level: isProduction ? "info" : "trace" },
		"mongodb": { appenders: [ "console" ], level: isProduction ? "info" : "trace" }
	}
} )

// Create the logger for this file
const log = getLogger( "main" )

// Attempt to load the environment variables file
if ( dotenv.config().parsed ) log.info( "Loaded the environment variables file." )
else log.warn( "Failed to load the environment variables file." )

// Initialise the MongoDB class
MongoDB.Initialise()

// Fail if any of the required environment variables are not set
if ( !process.env.HTTP_SERVER_ADDRESS ) throw new Error( "The HTTP_SERVER_ADDRESS environment variable is not set" )
if ( !process.env.HTTP_SERVER_PORT ) throw new Error( "The HTTP_SERVER_PORT environment variable is not set" )
if ( !process.env.EXPRESS_SESSION_SECRET ) throw new Error( "The EXPRESS_SESSION_SECRET environment variable is not set" )

// Assign the environment variables to constants for easier access
const HTTP_SERVER_ADDRESS = process.env.HTTP_SERVER_ADDRESS
const HTTP_SERVER_PORT = parseInt( process.env.HTTP_SERVER_PORT )
const EXPRESS_SESSION_SECRET = process.env.EXPRESS_SESSION_SECRET

// Create a new Express application
export const expressApp = express()
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

// Extend the Express session data interface to include our properties
declare module "express-session" {
	interface SessionData {
		chosenName: string
	}
}

// Log all requests to the console
/*expressApp.use( ( request, response, next ) => {
	log.debug( `${ request.method } ${ request.path } '${ request.body }' => ${ response.statusCode } ${ response.statusMessage }` )
	next()
} )*/

// Serve the client-side files
expressApp.use( express.static( "../Client/" ) )
log.info( "Setup serving the client-side files." )

// Import routes from other scripts
import( "./routes/name" )
log.info( "Loaded all API routes." )

// Start the Express (HTTP) server...
export const httpServer = expressApp.listen( HTTP_SERVER_PORT, HTTP_SERVER_ADDRESS, async () => {

	// Show the URL in the console
	log.info( `HTTP server listening on http://${ HTTP_SERVER_ADDRESS }:${ HTTP_SERVER_PORT }.` )

	// Open a connection to MongoDB
	await MongoDB.Connect()
	await MongoDB.Ping()

} )

// When CTRL+C is pressed, stop everything gracefully...
process.on( "SIGINT", async () => {
	log.info( "Stopping..." )
	httpServer.close()
	await MongoDB.Disconnect()
	process.exit( 0 ) // Success exit code
} )
