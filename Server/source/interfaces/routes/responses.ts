// Structure of the upload files API route response
export interface Attachment {
	type: string,
	path: string
}

// Structure of the get public rooms API route response
export interface PublicRoomPayload {
	name: string,
	guestCount: number,
	latestMessageSentAt: Date | null, 
	joinCode: string
}

// Structures of the get current room API route response
export interface GuestPayload {
	name: string,
	isRoomCreator: boolean
}
export interface MessagePayload {
	content: string,
	attachments: Attachment[],
	sentAt: Date,
	sentBy: string
}
export interface RoomPayload {
	name: string,
	isPrivate: boolean,
	joinCode: string | null,
	guests: GuestPayload[],
	messages: MessagePayload[]
}
