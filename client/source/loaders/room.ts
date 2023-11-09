import { Params } from "react-router-dom"

import { Room } from "../types/room"

export type Result = { room: Room } | null

export const roomLoader = ({ params }: { params: Params }): Result => {
	const id: string | undefined = params["id"]
	if (!id) return null

	return {
		room: {
			id: id
		}
	}
}
