class WebSocketClient {
	static #webSocket = null

	static Initialise() {
		if ( WebSocketClient.#webSocket !== null ) throw new Error( "WebSocket client has already been initialised" )

		WebSocketClient.#webSocket = new WebSocket( `${ window.location.protocol === "https:" ? "wss" : "ws" }://${ window.location.host }/api/chat` )

		WebSocketClient.#webSocket.addEventListener( "open", WebSocketClient.#onOpen.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "close", WebSocketClient.#onClose.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "message", WebSocketClient.#onMessage.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "error", WebSocketClient.#onError.bind( this ) )
	}

	static SendPayload( payload ) {
		if ( WebSocketClient.#webSocket === null ) throw new Error( "WebSocket client has not yet been initialised" )
		if ( WebSocketClient.#webSocket.readyState !== WebSocket.OPEN ) throw new Error( "WebSocket client is not yet connected" )

		WebSocketClient.#webSocket.send( JSON.stringify( payload ) )
	}

	static #onOpen() {
		console.debug( "Connected to WebSocket!" )
	}

	static #onClose() {
		console.debug( "Disconnected from WebSocket!" )
	}

	static #onMessage( message ) {
		console.debug( "Received message over WebSocket:", message.data )
	}

	static #onError( error ) {
		console.warn( "WebSocket error:", error )
	}

}
