// Import required third-party packages
import * as dotenv from "dotenv"
import { configure, getLogger } from "log4js"

// Import required data from other scripts
import initialiseExpress from "./express"
import MongoDB from "./mongodb"

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
		"mongodb": { appenders: [ "console" ], level: isProduction ? "info" : "trace" },
		"express": { appenders: [ "console" ], level: isProduction ? "info" : "trace" },
		"routes/room": { appenders: [ "console" ], level: isProduction ? "info" : "trace" }
	}
} )

// Create the logger for this file
const log = getLogger( "main" )

// Attempt to load the environment variables file
if ( dotenv.config().parsed ) log.info( "Loaded the environment variables file." )
else log.warn( "Failed to load the environment variables file." )

// Fail if the required environment variables are not set & assign them to constants for easier access
if ( !process.env.HTTP_SERVER_ADDRESS ) throw new Error( "The HTTP_SERVER_ADDRESS environment variable is not set" )
if ( !process.env.HTTP_SERVER_PORT ) throw new Error( "The HTTP_SERVER_PORT environment variable is not set" )
const HTTP_SERVER_ADDRESS = process.env.HTTP_SERVER_ADDRESS
const HTTP_SERVER_PORT = parseInt( process.env.HTTP_SERVER_PORT )

// Initialise the Express app
export const expressApp = initialiseExpress()

// Initialise the MongoDB class
MongoDB.Initialise()

// Start the Express HTTP server...
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
