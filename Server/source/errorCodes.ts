// Status codes for errors that can be returned by the server
export enum ErrorCodes {
	InvalidContentType = 0,
	MissingPayload = 1,
	PayloadMissingProperty = 2,
	PayloadMalformedValue = 3,
	NameAlreadyChosen = 4,
	DatabaseInsertFailure = 5
}
