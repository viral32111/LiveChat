"use strict" // Enables strict mode

// Redirect back to the choose name page if we haven't got a name yet
/* $( () => $.getJSON( "/api/name", null, ( payload ) => {
	if ( payload.hasName === false ) window.location.href = "/"
} ).fail( ( jqXHR, statusText, httpStatusMessage ) => {
	console.error( `Received HTTP status message '${ httpStatusMessage }' when checking if we have chosen a name` )
} ) ) */

const publicRoomsColumn1 = $( "#publicRoomsColumn1" )
const publicRoomsColumn2 = $( "#publicRoomsColumn2" )

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

/*
<div class="p-2 mb-2 border rounded bg-light">
	<div class="row">
		<div class="col-10">
			<h5 class="m-0"><strong>Example Room #1</strong></h5>
			<p class="m-0">12 participants, active 10 minutes ago.</p>
		</div>
		<div class="col-2">
			<button id="joinRoomButton" class="btn btn-primary w-100 h-100" type="submit">
				<span id="joinRoomButtonSpinner" class="spinner-border spinner-border-sm visually-hidden" role="status" aria-hidden="true"></span>
				<span>Join</span>
			</button>
		</div>
	</div>
</div>
*/

function createRoomElement( name, participantCount, lastActiveTime ) {
	const descriptionParagraphElement = $( "<p></p>" ).addClass( "m-0" ).text( `${ participantCount } participant(s), active ${ unixTimestampToHumanReadable( lastActiveTime ) }` )
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

function addRoomElementToPage( roomElement ) {
	const roomsInColumn1 = publicRoomsColumn1.children().length, roomsInColumn2 = publicRoomsColumn2.children().length

	if ( roomsInColumn1 <= roomsInColumn2 ) publicRoomsColumn1.append( roomElement )
	else publicRoomsColumn2.append( roomElement )
}

$( () => {
	addRoomElementToPage( createRoomElement( "Example Room #1", 12, new Date().getTime() - ( 60 * 10 * 1000 ) ) )
	addRoomElementToPage( createRoomElement( "Example Room #2", 11, new Date().getTime() - ( 60 * 2 * 1000 ) ) )
} )
