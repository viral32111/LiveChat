// Import third-party packages
import * as dotenv from "dotenv"
import express from "express"
import expressSession from "express-session"

// Load the environment variables configuration file
if ( dotenv.config().parsed ) {
	console.log( "Loaded environment variables from configuration file." )
} else {
	console.warn( "Failed to load environment variables from configuration file." )
}

// Import the MongoDB functions
import { mongoConnect, mongoDisconnect } from "./mongodb"

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
console.log( "Created Express application." )

// Enable JSON & cookie session support for Express
expressApp.use( express.json() )
expressApp.use( expressSession( { // TODO: MemoryStore is not recommended for production, use MongoDB instead!
	name: "sessionIdentifier",
	secret: EXPRESS_SESSION_SECRET,
	resave: true,
	saveUninitialized: false,
	cookie: {
		domain: HTTP_SERVER_ADDRESS,
		httpOnly: true,
		secure: false, // TODO: Set to true in production!
		sameSite: "strict"
	}
} ) )
console.log( "Enabled various middlewares for Express." )

// Log all requests to the console
/*expressApp.use( ( request, response, next ) => {
	console.log( `${ request.method } ${ request.path } '${ request.body }' => ${ response.statusCode } ${ response.statusMessage }` )
	next()
} )*/

// Serve the client-side files
expressApp.use( express.static( "../Client/" ) )
console.log( "Enabled serving static client-side files from Express." )

// Create a route for the root path
/*expressApp.get( "/", ( _, response ) => {
	response.status( 200 )
	response.setHeader( "Content-Type", "application/json" )
	response.send( {} )
} )*/

// Import routes from other scripts
import( "./routes/name" )
console.log( "Loaded API routes." )

// Start the HTTP server
console.log( "Starting HTTP server..." )
export const httpServer = expressApp.listen( HTTP_SERVER_PORT, HTTP_SERVER_ADDRESS, async () => {

	// Show the URL in the console
	console.log( `HTTP server now listening on http://${ HTTP_SERVER_ADDRESS }:${ HTTP_SERVER_PORT }` )

	// Attempt a connection to MongoDB
	console.log( "Testing connection to MongoDB..." )
	const mongoDatabase = await mongoConnect()
	await mongoDatabase.command( { ping: 1 } )
	console.log( "Connected to MongoDB! Disconnecting..." )
	await mongoDisconnect()
	console.log( "Disconnected from MongoDB!\n" )

} )
