// Import required third-party packages
import * as dotenv from "dotenv"
import { configure, getLogger } from "log4js"
import { Server } from "ws"

// Import required code from other scripts
import initialiseExpress from "./express"
import MongoDB from "./mongodb"

// Which environment mode are we running in?
export const isProduction = process.env.NODE_ENV === "production"
export const isTest = process.env.NODE_ENV === "test"

// Configure the logger library
configure( {
	appenders: {
		console: { type: "stdout" },
		file: { type: "file", filename: "./logs/server.log" }
	},
	categories: {
		"default": { appenders: [ isTest ? "file" : "console" ], level: isProduction ? "info" : "trace" },
		"main": { appenders: [ isTest ? "file" : "console" ], level: isProduction ? "info" : "trace" },
		"routes/name": { appenders: [ isTest ? "file" : "console" ], level: isProduction ? "info" : "trace" },
		"mongodb": { appenders: [ isTest ? "file" : "console" ], level: isProduction ? "info" : "trace" },
		"express": { appenders: [ isTest ? "file" : "console" ], level: isProduction ? "info" : "trace" },
		"routes/room": { appenders: [ isTest ? "file" : "console" ], level: isProduction ? "info" : "trace" },
		"routes/chat": { appenders: [ isTest ? "file" : "console" ], level: isProduction ? "info" : "trace" }
	}
} )

// Create the logger for this file
const log = getLogger( "main" )

// Attempt to load the environment variables file
if ( dotenv.config( { path: `./${ process.env.NODE_ENV }.env` } ).parsed ) log.info( `Loaded the '${ process.env.NODE_ENV }' environment variables file.` )
else log.warn( `Failed to load the '${ process.env.NODE_ENV }' environment variables file.` )

// Fail if the required environment variables are not set & assign them to constants for easier access
if ( !process.env.HTTP_SERVER_ADDRESS ) throw new Error( "The HTTP_SERVER_ADDRESS environment variable is not set" )
if ( !process.env.HTTP_SERVER_PORT ) throw new Error( "The HTTP_SERVER_PORT environment variable is not set" )
const HTTP_SERVER_ADDRESS = process.env.HTTP_SERVER_ADDRESS
const HTTP_SERVER_PORT = parseInt( process.env.HTTP_SERVER_PORT )

// Initialise the MongoDB class
MongoDB.Initialise()

// Initialise the Express app
export const expressApp = initialiseExpress()

// Import Express routes from other scripts
import( "./routes/name" )
import( "./routes/favicon" )
import( "./routes/room" )
import( "./routes/chat" )
log.info( "Loaded all API routes." )

// Create a WebSocket server without a HTTP server, as we will handle the upgrade ourselves
export const webSocketServer = new Server( {
	noServer: true
} )

// Start the Express HTTP server...
export const httpServer = expressApp.listen( HTTP_SERVER_PORT, HTTP_SERVER_ADDRESS, async () => {

	// Show the URL in the console
	log.info( `HTTP server listening on http://${ HTTP_SERVER_ADDRESS }:${ HTTP_SERVER_PORT }.` )

	// Open a connection to MongoDB
	await MongoDB.Connect()
	await MongoDB.Ping()

} )

// When CTRL+C is pressed, stop everything gracefully...
process.once( "SIGINT", async () => {
	log.info( "Stopping..." )

	httpServer.close( () => {
		log.info( "Stopped HTTP server." )

		webSocketServer.close( () => {
			log.info( "Stopped WebSocket server." )
		} )

		MongoDB.Disconnect().then( () => {
			process.exit( 0 ) // Success exit code
		} )
	} )
} )
