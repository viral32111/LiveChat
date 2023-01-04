"use strict" // Enables strict mode

// Get all the relevant UI elements
const publicRoomsColumn1 = $( "#publicRoomsColumn1" )
const publicRoomsColumn2 = $( "#publicRoomsColumn2" )
const noPublicRoomsNotice = $( "#noPublicRoomsNotice" )

function unixTimestampToHumanReadable( timestampMilliseconds ) {
	const currentTimestamp = new Date().getTime()
	const secondsDifference = ( currentTimestamp - timestampMilliseconds ) / 1000

	// Right this moment
	if ( secondsDifference <= 10 ) {
		return "right now"

	// Seconds
	} else if ( secondsDifference < 60 ) {
		return `${ secondsDifference } second(s) ago`

	// Minutes
	} else if ( secondsDifference >= 60 ) {
		return `${ Math.floor( secondsDifference / 60 ) } minute(s) ago`

	// Hours
	} else if ( secondsDifference >= 3600 ) {
		return `${ Math.floor( secondsDifference / 3600 ) } hours(s) ago`

	// Days
	} else if ( secondsDifference >= 86400 ) {
		return `${ Math.floor( secondsDifference / 86400 ) } days(s) ago`
	
	// Weeks
	} else if ( secondsDifference >= 604800 ) {
		return `${ Math.floor( secondsDifference / 604800 ) } week(s) ago`

	// Anything beyond month is a long time...
	} else if ( secondsDifference >= 2419200 ) {
		return `a long time ago`
	}

}

function createRoomElement( name, participantCount, lastActiveTimestamp ) {
	const descriptionParagraphElement = $( "<p></p>" ).addClass( "m-0" ).text( `${ participantCount } participant(s), active ${ unixTimestampToHumanReadable( lastActiveTimestamp ) }` )
	const nameStrong = $( "<strong></strong>" ).text( name )
	const nameHeading = $( "<h5></h5>" ).addClass( "m-0" ).append( nameStrong )
	const informationColumn = $( "<div></div>" ).addClass( "col-10" ).append( nameHeading, descriptionParagraphElement )

	const buttonTextSpan = $( "<span></span>" ).text( "Join" )
	const buttonSpinnerSpan = $( "<span></span>" ).addClass( "spinner-border spinner-border-sm visually-hidden" ).attr( "role", "status" ).attr( "aria-hidden", true )
	const button = $( "<button></button>" ).addClass( "btn btn-primary w-100 h-100" ).attr( "type", "submit" ).append( buttonSpinnerSpan, buttonTextSpan )
	const buttonColumnn = $( "<div></div>" ).addClass( "col-2" ).append( button )

	const bootstrapRow = $( "<div></div>" ).addClass( "row" ).append( informationColumn, buttonColumnn )
	const box = $( "<div></div>" ).addClass( "p-2 mb-2 border rounded bg-light" ).append( bootstrapRow )

	return box
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
