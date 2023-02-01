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
	const accessToken: string | undefined = loginResponse.access_token
	if ( accessToken === undefined ) throw new Error( "Login response does not contain an access token" )
	if ( accessToken === matrixClient.getAccessToken() ) throw new Error( "Login response access token does not match client access token" )

	return accessToken
}
