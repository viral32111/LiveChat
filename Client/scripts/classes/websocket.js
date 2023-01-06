class WebSocketClient {
	#webSocket = null

	Initialise() {
		if ( this.#webSocket !== null ) throw new Error( "WebSocket client has already been initialised" )

		this.#webSocket = new WebSocket( `${ window.location.protocol === "https:" ? "wss" : "ws" }://${ window.location.host }/api/chat` )

		this.#webSocket.addEventListener( "open", this.#onOpen.bind( this ) )
		this.#webSocket.addEventListener( "close", this.#onClose.bind( this ) )
		this.#webSocket.addEventListener( "message", this.#onMessage.bind( this ) )
		this.#webSocket.addEventListener( "error", this.#onError.bind( this ) )
	}

	SendPayload( payload ) {
		if ( this.#webSocket === null ) throw new Error( "WebSocket client has not yet been initialised" )
		if ( this.#webSocket.readyState !== WebSocket.OPEN ) throw new Error( "WebSocket client is not yet connected" )

		this.#webSocket.send( JSON.stringify( payload ) )
	}

	#onOpen() {
		console.debug( "Connected to WebSocket!" )
	}

	#onClose() {
		console.debug( "Disconnected from WebSocket!" )
	}

	#onMessage( message ) {
		console.debug( "Received message over WebSocket:", message.data )
	}

	#onError( error ) {
		console.warn( "WebSocket error:", error )
	}

}
