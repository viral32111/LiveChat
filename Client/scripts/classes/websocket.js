// Custom class to encapsulate WebSocket functionality
class WebSocketClient {
	
	// The WebSocket instance & custom payload types (same as the ones on the server API)
	static #webSocket = null
	static #broadcastMessageCallback = null
	static PayloadTypes = {
		Message: 0,
		Broadcast: 1
	}

	// Initialises the WebSocket client & registers event listeners
	static Initialise( broadcastMessageCallback ) {
		if ( WebSocketClient.#webSocket !== null ) throw new Error( "WebSocket client has already been initialised" )

		WebSocketClient.#webSocket = new WebSocket( `${ window.location.protocol === "https:" ? "wss" : "ws" }://${ window.location.host }/api/chat` )

		WebSocketClient.#webSocket.addEventListener( "open", WebSocketClient.#onOpen.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "close", WebSocketClient.#onClose.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "message", WebSocketClient.#onMessage.bind( this ) )
		WebSocketClient.#webSocket.addEventListener( "error", WebSocketClient.#onError.bind( this ) )

		WebSocketClient.#broadcastMessageCallback = broadcastMessageCallback
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

	// Runs when the WebSocket connection is opened...
	static #onOpen() {
		console.debug( "Connected to WebSocket!" )
	}

	// Runs when the WebSocket connection closes...
	static #onClose( event ) {
		console.debug( "Disconnected from WebSocket!", event.code, event.reason, event.wasClean )
	}

	// Runs when the WebSocket client receives a message from the server...
	static #onMessage( message ) {

		// Attempt to parse the message as JSON
		try {
			const serverPayload = JSON.parse( message.data.toString() )
			//console.dir( serverPayload )
			
			if ( serverPayload.type === WebSocketClient.PayloadTypes.Broadcast ) {
				WebSocketClient.#broadcastMessageCallback( serverPayload.data )
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
		WebSocketClient.#webSocket.close()
	}

}
