export function generateRandomString( length: number, characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" ) {
	let randomString = ""
	for ( let i = 0; i < length; i++ ) randomString += characters.charAt( Math.floor( Math.random() * characters.length ) )

	return randomString
}

export const generateRoomJoinCode = () => generateRandomString( 6, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" )
