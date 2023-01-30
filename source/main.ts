/*
https://matrix.org/docs/guides/usage-of-the-matrix-js-sdk
https://matrix-org.github.io/matrix-js-sdk/23.1.1/index.html
*/

import sdk from "matrix-js-sdk"

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

// Login with username & password to get the access token
if ( USER_TOKEN === undefined && USER_PASSWORD !== undefined ) {
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

// @ts-ignore
matrixClient.once( "sync", async ( state: string ) => {
	if ( state === "PREPARED" ) {
		console.log( "Synced with server, we are now ready!" )

		await matrixClient.setDisplayName( "Bot" )
		console.log( "Set display name" )

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

// @ts-ignore
matrixClient.on( "Room.timeline", ( event: any, room: any, toStartOfTimeline: boolean ) => {
	//console.debug( "Room.timeline:", event, room, toStartOfTimeline )

	console.log( "Room '%s' got new event: %s (%s)", room.name, event.getType(), toStartOfTimeline )
} )

// @ts-ignore
matrixClient.on( "RoomMember.membership", async ( event: any, member: any ) => {
	//console.debug( "RoomMember.membership:", event, member )

	if ( member.membership === "invite" && member.userId === userIdentifier ) {
		console.log( "We've been invited to room '%s'", member.roomId )

		/*
		await matrixClient.joinRoom( member.roomId )
		console.log( "Joined room '%s'", member.roomId )
		*/
	}
} )

// @ts-ignore
matrixClient.on( "RoomMember.typing", ( event: any, member: any ) => {
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
