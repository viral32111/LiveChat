// Import enumerations & interfaces from other scripts
import { WebSocketPayloadTypes } from "../enumerations/webSocket"
import { Attachment, GuestPayload } from "./routes/responses"

// Structure of the WebSocket payloads
export interface WebSocketPayload {
	type: WebSocketPayloadTypes,
	data: object
}

// Structure of the WebSocket message payloads
export interface WebSocketMessagePayload {
	content: string,
	attachments: Attachment[]
}

// Structure of the WebSocket guest update payloads
export interface WebSocketGuestUpdatePayload {
	guests: GuestPayload[]
}
