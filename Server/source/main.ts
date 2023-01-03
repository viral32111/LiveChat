// Import functions from native packages
import { randomUUID } from "crypto"

// Import third-party packages
import * as dotenv from "dotenv"
import express from "express"
import expressSession from "express-session"

// Load the .env configuration file
dotenv.config()

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

// Enable JSON support for Express
expressApp.use( express.json() )

// Enable cookie session support for Express
// TODO: MemoryStore is not recommended for production, use MongoDB instead!
expressApp.use( expressSession( {
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

// Serve the client-side files
expressApp.use( express.static( "../Client/" ) )

// Create a route for the root path
/*expressApp.get( "/", ( _, response ) => {
	response.status( 200 )
	response.setHeader( "Content-Type", "application/json" )
	response.send( {} )
} )*/

// Import routes from other scripts
import( "./routes/name" )

// Start the HTTP server
export const httpServer = expressApp.listen( HTTP_SERVER_PORT, HTTP_SERVER_ADDRESS, () => {
	console.log( `HTTP server listening on http://${ HTTP_SERVER_ADDRESS }:${ HTTP_SERVER_PORT }` )
} )
