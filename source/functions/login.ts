// Import the Matrix SDK
import { createClient } from "matrix-js-sdk"

// Structure expected from the login response
interface LoginResponse {
	user_id: string | undefined,
	device_id: string | undefined,
	access_token: string | undefined
}

// Structure returned from the login function
interface LoginResult {
	userIdentifier: string,
	deviceIdentifier: string,
	accessToken: string
}

// Logs in using username & password to get an access token, device id, etc.
export const loginWithCredentials = async ( userName: string, userPassword: string, homeServer: string ): Promise<LoginResult> => {
	if ( userName.length <= 0 ) throw new Error( "User name must not be empty" )
	if ( userPassword.length <= 0 ) throw new Error( "User password must not be empty" )
	if ( homeServer.length <= 0 ) throw new Error( "Home server must not be empty" )

	// Create a new client on the given homeserver
	const matrixClient = createClient( {
		baseUrl: `https://${ homeServer }`
	} )

	// Login with the given credentials
	const loginResponse: LoginResponse = await matrixClient.login( "m.login.password", {
		user: userName,
		password: userPassword
	} )

	// Ensure all required fields are present
	if ( loginResponse.user_id === undefined || loginResponse.user_id.length <= 0 ) throw new Error( "Login response does not contain a valid user ID" )
	if ( loginResponse.device_id === undefined || loginResponse.device_id.length <= 0 ) throw new Error( "Login response does not contain a valid device ID" )
	if ( loginResponse.access_token === undefined || loginResponse.access_token.length <= 0 ) throw new Error( "Login response does not contain a valid access token" )

	// Check the access token
	if ( loginResponse.access_token !== matrixClient.getAccessToken() ) throw new Error( "Login response access token does not match client access token" )

	return {
		userIdentifier: loginResponse.user_id,
		deviceIdentifier: loginResponse.device_id,
		accessToken: loginResponse.access_token
	}
}
