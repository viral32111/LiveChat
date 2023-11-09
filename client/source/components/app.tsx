import { JSX } from "react"
import { Link, Outlet } from "react-router-dom"

export const App = (): JSX.Element => {
	return (
		<div>
			<h1 className="text-3xl font-bold">Hello World</h1>
			<ul>
				<li>
					<Link className="text-blue-700 underline" to="/">
						Home
					</Link>
				</li>
				<li>
					<Link className="text-blue-700 underline" to="/setup">
						Setup
					</Link>
				</li>
				<li>
					<Link className="text-blue-700 underline" to="/rooms">
						Rooms
					</Link>
				</li>
				<li>
					<Link className="text-blue-700 underline" to="/chat">
						Chat
					</Link>
				</li>
			</ul>
			<Outlet />
		</div>
	)
}

export default App
