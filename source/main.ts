/*
https://matrix.org/docs/guides/usage-of-the-matrix-js-sdk
https://matrix-org.github.io/matrix-js-sdk/23.1.1/index.html
*/

// Import the Matrix SDK
import { createClient } from "matrix-js-sdk"

// Disable the SDK's built-in logging (except warnings & errors)
import loglevel from "loglevel"
const matrixSdkLogger = loglevel.getLogger( "matrix" )
matrixSdkLogger.setLevel( "warn" )

// Load our configuration as environment variables
import { config } from "dotenv"
config( { path: "./local.env" } )

// Ensure that required configuration variables are defined
if ( process.env.HOMESERVER_DOMAIN === undefined ) throw new Error( "HOMESERVER_DOMAIN is not defined in environment variables" )
if ( process.env.USER_NAME === undefined ) throw new Error( "USER_NAME is not defined in environment variables" )
if ( process.env.USER_PASSWORD === undefined && process.env.USER_TOKEN === undefined ) throw new Error( "Either USER_PASSWORD or USER_TOKEN is not defined in environment variables" )
const HOMESERVER_DOMAIN = process.env.HOMESERVER_DOMAIN
const USER_NAME = process.env.USER_NAME
const USER_PASSWORD = process.env.USER_PASSWORD
const USER_TOKEN = process.env.USER_TOKEN

// Easy access to some variables
export const userIdentifier = `@${ USER_NAME }:${ HOMESERVER_DOMAIN }`
export const deviceIdentifier = "matrix-bot"
let userToken = USER_TOKEN

// Parse command-line flags & arguments
import commandLineArgs from "command-line-args"
export const commandLineFlags = commandLineArgs( [
	{ name: "fetch-access-token" }, // DEPRECATED
	{ name: "set-display-name", type: String }
] )

// Deprecation notice
if ( "fetch-access-token" in commandLineFlags ) console.warn( "The --fetch-access-token flag is deprecated as tokens are now fetched automatically!" )

// Fetch an access token if we don't have one
import { fetchAccessToken } from "./functions/access-token.js"
if ( userToken === undefined || userToken.length <= 0 ) {
	if ( USER_PASSWORD === undefined || USER_PASSWORD.length <= 0 ) throw new Error( "User password must be provided to fetch access token" )

	userToken = await fetchAccessToken( USER_NAME, USER_PASSWORD, HOMESERVER_DOMAIN )
	console.log( "Fetched access token for user '%s' on home-server '%s'", USER_NAME, HOMESERVER_DOMAIN )
}

// Create the client
export const matrixClient = createClient( {
	baseUrl: `https://${ HOMESERVER_DOMAIN }`,
	userId: userIdentifier,
	accessToken: userToken,
	deviceId: deviceIdentifier
} )
console.log( "Created client for user '%s' on home-server '%s'", USER_NAME, HOMESERVER_DOMAIN )

// Import the event handlers
console.log( "Registering event handlers..." )
import( "./events.js" )

// Start the client
console.log( "Starting client..." )
await matrixClient.startClient( {
	initialSyncLimit: 10
} )
