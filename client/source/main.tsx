import "./index.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createBrowserRouter } from "react-router-dom"

import App from "./components/app.js"
import ChatPage from "./components/pages/chat.js"
import ErrorPage from "./components/pages/error.js"
import RoomsPage from "./components/pages/rooms.js"
import SetupPage from "./components/pages/setup.js"
import { roomLoader } from "./loaders/room.js"

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found!")

const router = createBrowserRouter([
	{
		path: "/",
		element: <App />,
		errorElement: <ErrorPage />,
		children: [
			{ path: "setup", element: <SetupPage /> },
			{ path: "rooms", element: <RoomsPage /> },
			{
				path: "chat",
				children: [
					{
						path: ":id",
						element: <ChatPage />,
						loader: roomLoader
					}
				]
			}
		]
	}
])

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
)
