// https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4.1
export enum WebSocketCloseCodes {
	CannotAccept = 1003
}

export enum WebSocketPayloadTypes {
	Message = 0,
	Acknowledgement = 1
}
