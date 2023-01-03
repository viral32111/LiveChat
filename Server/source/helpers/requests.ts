import { Response } from "express"

export function respondToRequest( response: Response, statusCode = 200, payload = {} ) {
	response.status( statusCode )
	response.setHeader( "Content-Type", "application/json" )
	response.send( payload )

	console.debug( "RESPONSE:", statusCode, payload )
}
