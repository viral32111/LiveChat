// Import required third-party packages
import { getLogger } from "log4js"

// Import required data from other scripts
import { expressApp } from "../main"
import { HTTPStatusCodes } from "../httpStatusCodes"
import { respondToRequest } from "../helpers/requests"

// Create the logger for this file
const log = getLogger( "routes/room" )

expressApp.get( "/api/room", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )
expressApp.post( "/api/room", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )
expressApp.get( "/api/rooms", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )
expressApp.delete( "/api/session", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )
