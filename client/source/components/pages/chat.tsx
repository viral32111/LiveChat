import { JSX } from "react"
import { useLoaderData } from "react-router-dom"

import { Result } from "../../loaders/room"

export const ChatPage = (): JSX.Element => {
	const data = useLoaderData() as Result

	return (
		<div>
			<h1>Chat</h1>
			<p>ID: {data?.room.id}</p>
		</div>
	)
}

export default ChatPage
