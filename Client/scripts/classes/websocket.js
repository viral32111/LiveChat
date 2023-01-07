// Custom class to encapsulate WebSocket functionality
class WebSocketClient {
	
	// The WebSocket instance & custom payload types (same as the ones on the server API)
	static #webSocket = null
	static #broadcastMessageCallback = null
	static #guestsUpdateCallback = null
	static #openCallback = null
	static #closeCallback = null
	static #shouldAutoReconnect = true
	static PayloadTypes = {
		Message: 0,
		Broadcast: 1,
		GuestsUpdate: 2
	}

	// Initialises the WebSocket client & registers event listeners
	static Initialise( broadcastMessageCallback, guestsUpdateCallback, openCallback, closeCallback ) {
		if ( WebSocketClient.#webSocket !== null ) throw new Error( "WebSocket client has already been initialised" )

		WebSocketClient.#webSocket = new WebSocket( `${ window.location.protocol === "https:" ? "wss" : "ws" }://${ window.location.host }/api/chat` )

		WebSocketClient.#webSocket.addEventListener( "open", WebSocketClient.#onOpen.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "close", WebSocketClient.#onClose.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "message", WebSocketClient.#onMessage.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "error", WebSocketClient.#onError.bind( this ) )

		WebSocketClient.#broadcastMessageCallback = broadcastMessageCallback
		WebSocketClient.#guestsUpdateCallback = guestsUpdateCallback
		WebSocketClient.#openCallback = openCallback
		WebSocketClient.#closeCallback = closeCallback

	}

	// Sends a payload to the server
	static SendPayload( type, data = {} ) {
		if ( WebSocketClient.#webSocket === null ) throw new Error( "WebSocket client has not yet been initialised" )
		if ( WebSocketClient.#webSocket.readyState !== WebSocket.OPEN ) throw new Error( "WebSocket client is not yet connected" )

		WebSocketClient.#webSocket.send( JSON.stringify( {
			type: type,
			data: data
		} ) )
	}

	// Closes the WebSocket connection for good
	static Close() {
		if ( WebSocketClient.#webSocket === null ) throw new Error( "WebSocket client has not yet been initialised" )
		if ( WebSocketClient.#webSocket.readyState !== WebSocket.OPEN ) throw new Error( "WebSocket client is not yet connected" )

		WebSocketClient.#shouldAutoReconnect = false
		WebSocketClient.#webSocket.close( 1000, "Goodbye. We'll meet again, don't know where, don't know when." )
		WebSocketClient.#webSocket = null
	}

	// Runs when the WebSocket connection is opened...
	static #onOpen() {
		console.debug( "Connected to WebSocket!" )
		WebSocketClient.#openCallback()
	}

	// Runs when the WebSocket connection closes...
	static #onClose( event ) {
		console.debug( "Disconnected from WebSocket!", event.code, event.reason, event.wasClean )
		WebSocketClient.#closeCallback( event.code, event.reason )

		if ( WebSocketClient.#shouldAutoReconnect ) {
			console.debug( "Attempting to reconnect..." )

			WebSocketClient.#webSocket = null
			WebSocketClient.Initialise(
				WebSocketClient.#broadcastMessageCallback,
				WebSocketClient.#guestsUpdateCallback,
				WebSocketClient.#openCallback,
				WebSocketClient.#closeCallback
			)
		}
	}

	// Runs when the WebSocket client receives a message from the server...
	static #onMessage( message ) {

		// Attempt to parse the message as JSON
		try {
			const serverPayload = JSON.parse( message.data.toString() )

			// Handle the payload based on its type
			if ( serverPayload.type === WebSocketClient.PayloadTypes.Broadcast ) {
				WebSocketClient.#broadcastMessageCallback( serverPayload.data )
			} else if ( serverPayload.type === WebSocketClient.PayloadTypes.GuestsUpdate ) {
				WebSocketClient.#guestsUpdateCallback( serverPayload.data )
			} else {
				console.warn( `Received unknown WebSocket payload type '${ serverPayload.type }'!` )
			}
		} catch {
			return console.error( `Failed to parse WebSocket message '${ message.data.toString() }' as JSON!` )
		}

	}

	// Runs when the WebSocket client encounters an error...
	static #onError( error ) {
		console.warn( "WebSocket error:", error )
		WebSocketClient.#shouldAutoReconnect = false
		WebSocketClient.#webSocket.close()
	}

}
