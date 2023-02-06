/*
https://matrix.org/docs/guides/usage-of-the-matrix-js-sdk
https://matrix-org.github.io/matrix-js-sdk/23.1.1/index.html
*/

// Import the Matrix SDK
import { createClient, MemoryStore } from "matrix-js-sdk"
import { LocalStorageCryptoStore } from "matrix-js-sdk/lib/crypto/store/localStorage-crypto-store.js"

// Disable the SDK's built-in logging (except warnings & errors)
import loglevel from "loglevel"
const matrixSdkLogger = loglevel.getLogger( "matrix" )
matrixSdkLogger.setLevel( "warn" )

// Import Olm for end-to-end encryption
import olm from "@matrix-org/olm"
global.Olm = olm

// Import LocalStorage
import { LocalStorage } from "node-localstorage"
const localStorage = new LocalStorage( "./data/" )

// Load our configuration as environment variables
import { config } from "dotenv"
config( { path: "./local.env" } )

// Ensure that required configuration variables are defined
if ( process.env.HOMESERVER_DOMAIN === undefined ) throw new Error( "HOMESERVER_DOMAIN is not defined in environment variables" )
if ( process.env.USER_NAME === undefined ) throw new Error( "USER_NAME is not defined in environment variables" )
if ( process.env.USER_PASSWORD === undefined && process.env.ACCESS_TOKEN === undefined ) throw new Error( "Either USER_PASSWORD or ACCESS_TOKEN is not defined in environment variables" )
if ( process.env.DEVICE_ID !== undefined && process.env.ACCESS_TOKEN === undefined ) throw new Error( "Can only define DEVICE_ID when ACCESS_TOKEN is also defined in environment variables" )
export const HOMESERVER_DOMAIN = process.env.HOMESERVER_DOMAIN
export const USER_NAME = process.env.USER_NAME
export const USER_PASSWORD = process.env.USER_PASSWORD

// These are changed later on after login
export let userIdentifier = `@${ USER_NAME }:${ HOMESERVER_DOMAIN }`
export let deviceIdentifier = process.env.DEVICE_ID
export let accessToken = process.env.ACCESS_TOKEN

// Parse command-line flags & arguments
import commandLineArgs from "command-line-args"
export const commandLineFlags = commandLineArgs( [
	{ name: "fetch-access-token" }, // DEPRECATED
	{ name: "set-display-name", type: String }
] )

// Deprecation notices
if ( process.env.USER_TOKEN !== undefined ) console.warn( "Environment variable USER_TOKEN is deprecated, use ACCESS_TOKEN instead" )
if ( "fetch-access-token" in commandLineFlags ) console.warn( "The --fetch-access-token flag is deprecated as tokens are now fetched automatically!" )

// Login with credentials if we don't have our access token, device ID, etc
import { loginWithCredentials } from "./functions/login.js"
if ( accessToken === undefined || accessToken.length <= 0 ) {
	if ( USER_PASSWORD === undefined || USER_PASSWORD.length <= 0 ) throw new Error( "User password must be provided when logging in using credentials" )
	if ( deviceIdentifier !== undefined && deviceIdentifier.length > 0 ) throw new Error( "Device identifier must not be provided when logging in using credentials" )

	const loginResponse = await loginWithCredentials( USER_NAME, USER_PASSWORD, HOMESERVER_DOMAIN )
	userIdentifier = loginResponse.userIdentifier
	deviceIdentifier = loginResponse.deviceIdentifier
	accessToken = loginResponse.accessToken

	console.log( "Logged in as '%s' (device: '%s', token: '%s')", userIdentifier, deviceIdentifier, accessToken )
}

// Create the client
export const matrixClient = createClient( {
	baseUrl: `https://${ HOMESERVER_DOMAIN }`,
	userId: userIdentifier,
	deviceId: deviceIdentifier,
	accessToken: accessToken,
	cryptoStore: new LocalStorageCryptoStore( localStorage ),
	store: new MemoryStore( {
		localStorage: localStorage
	} )
} )
console.log( "Created client for user '%s' (device '%s') on home-server '%s'", USER_NAME, deviceIdentifier, HOMESERVER_DOMAIN )

// Setup encryption
await matrixClient.initCrypto()
console.log( "Initialised support for end-to-end encryption (%s).", matrixClient.isCryptoEnabled() )

// Import the event handlers
console.log( "Registering event handlers..." )
import( "./events.js" )

// Start the client
console.log( "Starting client..." )
await matrixClient.startClient( {
	initialSyncLimit: 0 // Don't sync any messages on startup
} )
