// Gets the human readable representation for however long ago a given unix timestamp was
function unixTimestampToHumanReadable( timestampMilliseconds ) {

	// Calculate the difference between now and the given timestamp, in seconds
	const secondsDifference = ( new Date().getTime() - timestampMilliseconds ) / 1000

	if ( secondsDifference <= 10 ) return "right now" // Pretty much right this moment
	else if ( secondsDifference < 60 ) return `${ secondsDifference } second(s) ago` // Seconds
	else if ( secondsDifference < 3600 ) return `${ Math.floor( secondsDifference / 60 ) } minute(s) ago` // Minutes
	else if ( secondsDifference < 86400 ) return `${ Math.floor( secondsDifference / 3600 ) } hour(s) ago` // Hours
	else if ( secondsDifference < 604800 ) return `${ Math.floor( secondsDifference / 86400 ) } days(s) ago` // Days
	else if ( secondsDifference < 2419200 ) return `${ Math.floor( secondsDifference / 604800 ) } week(s) ago` // Weeks
	else return `a long time ago` // Longer than a month

}
