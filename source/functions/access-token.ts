import { createClient } from "matrix-js-sdk"
import { deviceIdentifier } from "../main.js"

// Fetch an access token for the given user
export const fetchAccessToken = async ( userName: string, userPassword: string, homeServer: string ) => {
	if ( userName.length <= 0 ) throw new Error( "User name must not be empty" )
	if ( userPassword.length <= 0 ) throw new Error( "User password must not be empty" )

	// Create a new client on the given homeserver
	const matrixClient = createClient( {
		baseUrl: `https://${ homeServer }`,
		deviceId: deviceIdentifier
	} )

	// Login with the given credentials
	const loginResponse = await matrixClient.login( "m.login.password", {
		user: userName,
		password: userPassword
	} )

	// Check the response
	const responseAccessToken: string | undefined = loginResponse.access_token
	const clientAccessToken = matrixClient.getAccessToken()
	if ( responseAccessToken === undefined || responseAccessToken.length <= 0 ) throw new Error( "Login response does not contain a valid access token" )
	if ( responseAccessToken !== clientAccessToken ) throw new Error( `Login response access token (${ responseAccessToken }) does not match client access token (${ matrixClient.getAccessToken() })` )

	return responseAccessToken
}
