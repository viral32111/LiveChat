// Import required code from third-party packages
import { getLogger } from "log4js"
import webSocket from "ws"

// Import required code from other scripts
import { expressApp } from "../main"
import { HTTPStatusCodes } from "../enumerations/httpStatusCodes"
import { respondToRequest } from "../helpers/requests"

// Create the logger for this file
const log = getLogger( "routes/chat" )

// TODO: Route for opening a websocket connection
expressApp.get( "/api/chat", ( _, response ) => respondToRequest( response, HTTPStatusCodes.NotImplemented ) )
