// Standard WebSocket closure codes https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4.1
export enum WebSocketCloseCodes {
	GoingAway = 1001,
	CannotAccept = 1003
}

// Custom codes for WebSocket payloads
export enum WebSocketPayloadTypes {
	Message = 0,
	Broadcast = 1
}
