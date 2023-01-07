// Structure of the choose name API route request payload
export interface ChooseNamePayload {
	desiredName: string
}

// Structure of the create room API route request
export interface CreateRoomPayload {
	name: string,
	isPrivate: boolean
}
