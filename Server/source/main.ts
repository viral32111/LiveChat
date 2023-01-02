// Import third-party packages
import * as dotenv from "dotenv"
import express from "express"
import { MongoClient } from "mongodb"

// Load the .env configuration file
dotenv.config()

// Fail if any of the required environment variables are not set
if ( !process.env.HTTP_SERVER_ADDRESS ) throw new Error( "The HTTP_SERVER_ADDRESS environment variable is not set" )
if ( !process.env.HTTP_SERVER_PORT ) throw new Error( "The HTTP_SERVER_PORT environment variable is not set" )
if ( !process.env.MONGO_HOST ) throw new Error( "The MONGO_HOST environment variable is not set" )
if ( !process.env.MONGO_PORT ) throw new Error( "The MONGO_PORT environment variable is not set" )
if ( !process.env.MONGO_DATABASE ) throw new Error( "The MONGO_DATABASE environment variable is not set" )
if ( !process.env.MONGO_USER_NAME ) throw new Error( "The MONGO_USER_NAME environment variable is not set" )
if ( !process.env.MONGO_USER_PASS ) throw new Error( "The MONGO_USER_PASS environment variable is not set" )

// Assign the environment variables to constants for easier access
const HTTP_SERVER_ADDRESS = process.env.HTTP_SERVER_ADDRESS
const HTTP_SERVER_PORT = parseInt( process.env.HTTP_SERVER_PORT )

const MONGO_HOST = process.env.MONGO_HOST
const MONGO_PORT = parseInt( process.env.MONGO_PORT )
const MONGO_DATABASE = process.env.MONGO_DATABASE
const MONGO_USER_NAME = process.env.MONGO_USER_NAME
const MONGO_USER_PASS = process.env.MONGO_USER_PASS

// Create a new Express application
export const expressApp = express()

// Enable JSON support for Express
expressApp.use( express.json() )

// Create a new MongoDB client
export const mongoClient = new MongoClient( `mongodb://${ MONGO_USER_NAME }:${ MONGO_USER_PASS }@${ MONGO_HOST }:${ MONGO_PORT }/${ MONGO_DATABASE }` )

// Create a route for the root path
expressApp.get( "/", ( _, response ) => {
	response.status( 200 )
	response.header( "Content-Type", "application/json" )
	response.send( {} )
} )

// Start the HTTP server
export const httpServer = expressApp.listen( HTTP_SERVER_PORT, HTTP_SERVER_ADDRESS, () => {
	console.log( `HTTP server listening on http://${ HTTP_SERVER_ADDRESS }:${ HTTP_SERVER_PORT }` )
} )
