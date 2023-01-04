"use strict" // Enables strict mode

// Get all the relevant UI elements
const publicRoomsColumn1 = $( "#publicRoomsColumn1" )
const publicRoomsColumn2 = $( "#publicRoomsColumn2" )
const noPublicRoomsNotice = $( "#noPublicRoomsNotice" )

// Gets the human readable representation for however long ago a given unix timestamp was
function unixTimestampToHumanReadable( timestampMilliseconds ) {

	// Calculate the difference between now and the given timestamp, in seconds
	const secondsDifference = ( currentTimestamp - new Date().getTime() ) / 1000

	if ( secondsDifference <= 10 ) return "right now" // Pretty much right this moment
	else if ( secondsDifference < 60 ) return `${ secondsDifference } second(s) ago` // Seconds
	else if ( secondsDifference >= 60 ) return `${ Math.floor( secondsDifference / 60 ) } minute(s) ago` // Minutes
	else if ( secondsDifference >= 3600 ) return `${ Math.floor( secondsDifference / 3600 ) } hours(s) ago` // Hours
	else if ( secondsDifference >= 86400 ) return `${ Math.floor( secondsDifference / 86400 ) } days(s) ago` // Days
	else if ( secondsDifference >= 604800 ) return `${ Math.floor( secondsDifference / 604800 ) } week(s) ago` // Weeks
	else if ( secondsDifference >= 2419200 ) return `a long time ago` // Longer than a month

}

// Creates all the HTML for a new room element, using data from the server API
function createRoomElement( name, participantCount, lastActiveTimestamp ) {

	// Name & description
	const descriptionParagraphElement = $( "<p></p>" ).addClass( "m-0" ).text( `${ participantCount } participant(s), active ${ unixTimestampToHumanReadable( lastActiveTimestamp ) }` )
	const nameStrong = $( "<strong></strong>" ).text( name )
	const nameHeading = $( "<h5></h5>" ).addClass( "m-0" ).append( nameStrong )
	const informationColumn = $( "<div></div>" ).addClass( "col-10" ).append( nameHeading, descriptionParagraphElement )

	// Join button
	const buttonTextSpan = $( "<span></span>" ).text( "Join" )
	const buttonSpinnerSpan = $( "<span></span>" ).addClass( "spinner-border spinner-border-sm visually-hidden" ).attr( "role", "status" ).attr( "aria-hidden", true )
	const button = $( "<button></button>" ).addClass( "btn btn-primary w-100 h-100" ).attr( "type", "submit" ).append( buttonSpinnerSpan, buttonTextSpan )
	const buttonColumnn = $( "<div></div>" ).addClass( "col-2" ).append( button )

	// Bootstrap positioning & styling
	const bootstrapRow = $( "<div></div>" ).addClass( "row" ).append( informationColumn, buttonColumnn )
	return $( "<div></div>" ).addClass( "p-2 mb-2 border rounded bg-light" ).append( bootstrapRow )

}

// Adds a room element, created using the function above, to the page
function addRoomElementToPage( roomElement ) {

	// Get the number of room elements (children) in each column
	const roomsInColumn1 = publicRoomsColumn1.children().length, roomsInColumn2 = publicRoomsColumn2.children().length

	// Hide the no rooms notice, if this is the first room being added
	if ( roomsInColumn1 === 0 && roomsInColumn2 === 0 ) noPublicRoomsNotice.addClass( "visually-hidden" )

	// Add the room element to whichever column has the least rooms in it, for an even distribution
	if ( roomsInColumn1 <= roomsInColumn2 ) publicRoomsColumn1.append( roomElement )
	else publicRoomsColumn2.append( roomElement )

}

// When the page loads...
$( () => {

	// Redirect back to the choose name page if we haven't got a name yet
	$.getJSON( "/api/name", ( payload ) => {
		if ( payload.hasName === false ) window.location.href = "/"
	} ).fail( ( request, _, httpStatusMessage ) => {
		console.error( `Received HTTP status message '${ httpStatusMessage }' when checking if we have chosen a name` )
		handleServerErrorCode( request.responseText )
		// TODO: Redirect back to the choose name page anyway?
	} )

	// Populate the page with the public rooms fetched from the server-side API
	$.getJSON( "/api/rooms", ( payload ) => payload.publicRooms.forEach( roomData => {
		addRoomElementToPage( createRoomElement( roomData.name, roomData.participantCount, roomData.lastActiveTimestamp ) )
	} ) ).fail( ( request, _, httpStatusMessage ) => {
		console.error( `Received '${ httpStatusMessage }' '${ request.responseText }' when fetching the list of public rooms` )
		handleServerErrorCode( request.responseText )
	} )

} )
