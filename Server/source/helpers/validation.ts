// The regular expression & helper function for validating the chosen name (alphanumeric characters, 2 to 30)
// NOTE: Keep this the same as the one on the client!
const chosenNamePattern = new RegExp( /^[A-Za-z0-9_]{2,30}$/ )
export const validateChosenName = ( chosenName: string ) => chosenNamePattern.test( chosenName )
