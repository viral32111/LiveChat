// Custom status codes for errors returned by Express
export enum ErrorCodes {
	InvalidContentType = 0,
	MissingPayload = 1,
	PayloadMissingProperty = 2,
	PayloadMalformedValue = 3,
	NameAlreadyChosen = 4,
	DatabaseInsertFailure = 5,
	NameNotChosen = 6,
	ExpressSessionDestroyFailure = 7,
	DatabaseDeleteFailure = 8,
	DatabaseFindFailure = 9,
	MustUpgradeToWebSocket = 10,
	RoomNotJoined = 11,
	NoFilesUploaded = 12,
	NoData = 13,
	DatabaseOperationFailure = 14,
	BroadcastFailure = 15
}
