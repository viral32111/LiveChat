class WebSocketClient {
	static #webSocket = null
	static PayloadTypes = {
		Message: 0,
		Acknowledgement: 1
	}

	static Initialise() {
		if ( WebSocketClient.#webSocket !== null ) throw new Error( "WebSocket client has already been initialised" )

		WebSocketClient.#webSocket = new WebSocket( `${ window.location.protocol === "https:" ? "wss" : "ws" }://${ window.location.host }/api/chat` )

		WebSocketClient.#webSocket.addEventListener( "open", WebSocketClient.#onOpen.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "close", WebSocketClient.#onClose.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "message", WebSocketClient.#onMessage.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "error", WebSocketClient.#onError.bind( this ) )
	}

	static SendPayload( type, data = {} ) {
		if ( WebSocketClient.#webSocket === null ) throw new Error( "WebSocket client has not yet been initialised" )
		if ( WebSocketClient.#webSocket.readyState !== WebSocket.OPEN ) throw new Error( "WebSocket client is not yet connected" )

		WebSocketClient.#webSocket.send( JSON.stringify( {
			type: type,
			data: data
		} ) )
	}

	static #onOpen() {
		console.debug( "Connected to WebSocket!" )
	}

	static #onClose() {
		console.debug( "Disconnected from WebSocket!" )
	}

	static #onMessage( message ) {
		console.debug( "Server sent:", message.data.toString() )

		try {
			const serverPayload = JSON.parse( message.data.toString() )
			console.dir( serverPayload )
		} catch {
			return console.error( `Failed to parse WebSocket message '${ message.data.toString() }' as JSON!` )
		}
	}

	static #onError( error ) {
		console.warn( "WebSocket error:", error )
	}

}
