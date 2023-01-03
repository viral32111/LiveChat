"use strict" // Enables strict mode

// Redirect back to the choose name page if we haven't got a name yet
$( () => $.getJSON( "/api/name", ( payload ) => {
	if ( payload.hasName === false ) window.location.href = "/"
} ) )
