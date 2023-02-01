/*
https://matrix.org/docs/guides/usage-of-the-matrix-js-sdk
https://matrix-org.github.io/matrix-js-sdk/23.1.1/index.html
*/

import sdk, { ClientEvent, RoomEvent, RoomMemberEvent } from "matrix-js-sdk"
import { SyncState } from "matrix-js-sdk/lib/sync.js"

/*
$ matrix-bot --fetch-access-token
$ matrix-bot --set-display-name <NAME>
*/

import { config } from "dotenv"
config( { path: ".env" } )

if ( process.env.HOMESERVER_DOMAIN === undefined ) throw new Error( "HOMESERVER_DOMAIN is not defined in environment variables" )
if ( process.env.USER_NAME === undefined ) throw new Error( "USER_NAME is not defined in environment variables" )
if ( process.env.USER_PASSWORD === undefined && process.env.USER_TOKEN === undefined ) throw new Error( "Either USER_PASSWORD or USER_TOKEN is not defined in environment variables" )
const HOMESERVER_DOMAIN = process.env.HOMESERVER_DOMAIN
const USER_NAME = process.env.USER_NAME
const USER_PASSWORD = process.env.USER_PASSWORD
const USER_TOKEN = process.env.USER_TOKEN

const userIdentifier = `@${ USER_NAME }:${ HOMESERVER_DOMAIN }`
const deviceIdentifier = "matrix-bot"

import commandLineArgs from "command-line-args"
const cliOptions = commandLineArgs( [
	{ name: "fetch-access-token" },
	{ name: "set-display-name", type: String }
] )
const FETCH_ACCESS_TOKEN = "fetch-access-token" in cliOptions
const SET_DISPLAY_NAME: string | null | undefined = cliOptions[ "set-display-name" ]

// Login with username & password to get the access token
if ( FETCH_ACCESS_TOKEN === true ) {
	if ( USER_TOKEN !== undefined || USER_PASSWORD === undefined ) throw new Error( "USER_TOKEN must not be defined, but USER_PASSWORD must be defined" )

	const matrixClient = sdk.createClient( {
		baseUrl: `https://${ HOMESERVER_DOMAIN }`,
		deviceId: deviceIdentifier
	} )
	console.log( "Created client on home-server '%s'", HOMESERVER_DOMAIN )
	
	console.log( "Logging in as '%s'...", USER_NAME )
	const loginResponse = await matrixClient.login( "m.login.password", {
		user: USER_NAME,
		password: USER_PASSWORD
	} )

	console.log( "Got access token: '%s' (%s)", loginResponse.access_token, matrixClient.getAccessToken() )
	process.exit( 0 )
}

const matrixClient = sdk.createClient( {
	baseUrl: `https://${ HOMESERVER_DOMAIN }`,
	userId: userIdentifier,
	accessToken: USER_TOKEN,
	deviceId: deviceIdentifier
} )
console.log( "Created client for user '%s' on home-server '%s'", USER_NAME, HOMESERVER_DOMAIN )

matrixClient.once( ClientEvent.Sync, async ( state ) => {
	if ( state === SyncState.Prepared ) {
		console.log( "Synced with server, we are now ready!" )

		if ( SET_DISPLAY_NAME !== undefined ) {
			if ( SET_DISPLAY_NAME === null || SET_DISPLAY_NAME.length <= 0 ) throw new Error( "Display name must not be null or empty" )

			await matrixClient.setDisplayName( "Bot" )
			console.log( "Set display name to '%s'", SET_DISPLAY_NAME )
		}

		const rooms = matrixClient.getRooms()
		console.log( "Found %d rooms", rooms.length )
		for ( const room of rooms ) {
			console.log( "\tRoom '%s' with %d members", room.name, room.getJoinedMembers().length )
			for ( const roomMember of room.getJoinedMembers() ) console.log( "\t\tMember '%s'", roomMember.name )
		}

	} else {
		console.warn( "Unknown sync state: '%s'", state )
		process.exit( 1 )
	}
} )

matrixClient.on( RoomEvent.Timeline, async ( event, room, toStartOfTimeline ) => {
	if ( room === undefined ) throw new Error( "Room is undefined in RoomEvent.Timeline event handler" )
	console.debug( "Room '%s' got new TIMELINE event: %s (%s)", room.name, event.getType(), toStartOfTimeline )

	if ( event.getType() === "m.room.message" && toStartOfTimeline === false ) {
		const messageSender = event.getSender()
		const messageContent = event.getContent().body
		console.log( "Message '%s' from '%s'", messageContent, messageSender )

		if ( messageContent === "ping" ) {
			await matrixClient.sendTextMessage( room.roomId, "pong" )
		}
	}
} )

matrixClient.on( RoomMemberEvent.Membership, async ( event, member ) => {
	console.debug( "Member '%s' got new MEMBERSHIP event: %s", member.name, event.getType() )

	if ( member.membership === "invite" && member.userId === userIdentifier ) {
		console.log( "We've been invited to room '%s'", member.roomId )

		/*
		await matrixClient.joinRoom( member.roomId )
		console.log( "Joined room '%s'", member.roomId )
		*/
	}
} )

matrixClient.on( RoomMemberEvent.Typing, ( event, member ) => {
	console.debug( "Member '%s' got new TYPING event: %s", member.name, event.getType() )

	if ( member.typing ) {
		console.log( "Member '%s' started typing..." )
	} else {
		console.log( "Member '%s' stopped typing..." )
	}
} )

console.log( "Starting client..." )
await matrixClient.startClient( {
	initialSyncLimit: 10
} )
