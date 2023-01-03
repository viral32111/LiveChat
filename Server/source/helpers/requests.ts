// Import the response type from Express
import { Response } from "express"

// Helper function to easily respond to a HTTP request with a JSON payload
export function respondToRequest( response: Response, statusCode = 200, payload = {} ) {
	response.status( statusCode )
	response.setHeader( "Content-Type", "application/json" )
	response.send( payload )
}
