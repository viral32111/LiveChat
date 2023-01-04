// NOTE: Keep these regular expressions the same as they are on the client!

// The regular expression & helper function for validating chosen names (alphanumeric characters, 2 to 30)
const chosenNamePattern = new RegExp( /^[A-Za-z0-9_]{2,30}$/ )
export const validateChosenName = ( chosenName: string ) => chosenNamePattern.test( chosenName )

// The regular expression & helper function for validating room names
const roomNameValidationPattern = new RegExp( /^[\w\d .,()[\]<>+=\-!:;$£%&*#@?|]{1,50}$/ )
export const validateRoomName = ( roomName: string ) => roomNameValidationPattern.test( roomName )

// The regular expression & helper function for validating room join codes
const roomJoinCodeValidationPattern = new RegExp( /^[A-Za-z]{6}$/ )
export const validateRoomJoinCode = ( roomJoinCode: string ) => roomJoinCodeValidationPattern.test( roomJoinCode )
