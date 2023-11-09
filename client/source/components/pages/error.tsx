import { JSX } from "react"
import { useRouteError } from "react-router-dom"

interface RouteError extends Error {
	statusText?: string
}

export const ErrorPage = (): JSX.Element => {
	const error = useRouteError() as RouteError

	console.error(error)

	return (
		<div>
			<h1>Error</h1>
			<p>{error.statusText ?? error.message}</p>
		</div>
	)
}

export default ErrorPage
