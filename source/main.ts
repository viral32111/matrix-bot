/*
https://github.com/matrix-org/matrix-js-sdk
https://matrix-org.github.io/matrix-js-sdk/15.5.1/index.html
https://matrix.org/docs/guides/usage-of-the-matrix-js-sdk
https://matrix.org/docs/guides/end-to-end-encryption-implementation-guide
*/

import { format } from "util"
import { request } from "https"

import olm from "olm"
global.Olm = olm

import { createClient, MatrixEvent, Room } from "matrix-js-sdk"
import { LocalStorage } from "node-localstorage"

// @ts-expect-error: Undocumented pile of garbage
import { WebStorageSessionStore } from "matrix-js-sdk/lib/store/session/webstorage"

import { LocalStorageCryptoStore } from "matrix-js-sdk/lib/crypto/store/localStorage-crypto-store"

import { getLogger, levels } from "loglevel"
getLogger( "matrix" ).setDefaultLevel( levels.SILENT )

const placeToPutThings = new LocalStorage( "./my_local_storage" )
const fancyMagic = new WebStorageSessionStore( placeToPutThings )
const moreFancyMagic = new LocalStorageCryptoStore( placeToPutThings )

const client = createClient( {
	baseUrl: "https://matrix-client.matrix.org",
	sessionStore: fancyMagic,
	cryptoStore: moreFancyMagic,
	//accessToken: "REDACTED",
	userId: "REDACTED",
	deviceId: "cum jar"
} )

const primaryRoomIdentifier = "REDACTED"

client.initCrypto().then( () => {
	console.log( "crypto innit" )
	
	client.login( "m.login.password", {
		"user": "REDACTED",
		"password": "REDACTED",
	} ).then( ( response ) => {
		console.log( "The access token is '%s'", response.access_token )
	
		client.startClient( {
			initialSyncLimit: 0
		} )
	} )
} )

client.once( "sync", ( state, previousState, result ) => {
	if ( state === "PREPARED" ) {
		console.log( "I am prepared!" )

		const rooms = client.getRooms()
		
		for ( const room of rooms ) {
			console.log( room.name, room.roomId )
		}

		/*if ( room.name !== "viral32111's community" ) continue

		primaryRoomIdentifier = room.roomId

		console.log( "My primary room identifier:", primaryRoomIdentifier )*/

		/*client.sendEvent( room.roomId, "m.room.message", {
			"body": format( "Hello, I'm now here!\nThis room's identifier is %s.", room.roomId ),
			"msgtype": "m.text"
		}, "" ).then( () => {
			console.log( "Startup message sent!" )
		} )*/

	} else {
		console.log( "Unknown state??", state, previousState, result )
	}
} )

/*client.on( "RoomMember.membership", ( event: MatrixEvent, member: RoomMember ) => {
	if ( member.membership === "invite" && member.userId === client.getUserId() ) {
		console.log( "Joining room: '%s'...", member.roomId )

		client.joinRoom( member.roomId ).then( () => {
			console.log( "Joined roon: '%s'", member.roomId )
		} )
	}
} )*/

client.on( "Room.timeline", ( event: MatrixEvent, room: Room ) => {
	if ( !client.isInitialSyncComplete() ) return

	if ( event.getType() === "m.room.message" && room.roomId === primaryRoomIdentifier ) {
		if ( event.sender.userId === client.getUserId() ) {
			console.log( "Ignoring my own message..." )
			return
		}

		console.log( "New message '%s' in '%s'", event.getContent().body, room.roomId )

		if ( event.getContent().body !== "" ) {
			const payload = JSON.stringify( {
				"username": format( "%s (%s)", event.sender.rawDisplayName, event.sender.userId ),
				"avatar_url": event.sender.getAvatarUrl( client.getHomeserverUrl(), 512, 512, "crop", true, true ),
				"content": event.getContent().body,
				"allowed_mentions": { "parse": [] }
			} )
			
			console.log( payload )
	
			const webhookRequest = request( "https://discord.com/api/webhooks/REDACTED/REDACTED", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": payload.length
				}
			}, ( response ) => {
				console.log( "Webhook response code:", response.statusCode, response.statusMessage )
	
				if ( response.statusCode ) {
					if ( response.statusCode >= 200 && response.statusCode <= 300 ) {
						client.sendReadReceipt( event )
					}
				}
	
				let data = ""
	
				response.setEncoding( "utf8" )
	
				response.on( "data", ( chunk ) => {
					data += chunk
				} )
	
				response.on( "end", () => {
					console.log( "Webhook response data: '%s'", data )
				} )
			} )
	
			webhookRequest.once( "error", ( error ) => {
				console.error( "Webhook error!", error )
			} )
	
			webhookRequest.write( payload )
			webhookRequest.end()
		}

		/*if ( event.getContent().body === "!bye" ) {
			client.sendEvent( room.roomId, "m.room.message", {
				"body": format( "Goodbye cruel world." ),
				"msgtype": "m.text"
			}, "" ).then( () => {
				client.stopClient()
				process.exit( 0 )
			} )
		} else if ( event.getContent().body === "!me" ) {
			client.sendEvent( room.roomId, "m.room.message", {
				"body": format( "Hello %s, your identifier is %s.", event.sender.name, event.sender.userId ),
				"msgtype": "m.text"
			}, "" )
		
		} else if ( event.getContent().body.startsWith( "!notice " ) ) {
			client.sendEvent( room.roomId, "m.room.message", {
				"body": format( "This is a notice! %s", event.getContent().body.substring( 8 ) ),
				"msgtype": "m.notice"
			}, "" )
		}*/
	} else if ( event.getType() === "m.room.encrypted" && room.roomId === primaryRoomIdentifier ) {
		if ( event.sender.userId === client.getUserId() ) {
			console.log( "Ignoring my own message..." )
			return
		}

		console.log( "Decrypting new message in '%s' from '%s'...", room.roomId, event.sender.userId )

		client.decryptEventIfNeeded( event ).then( () => {
			console.log( "Decrypted message: '%s' (%d, %d)", event.getContent().body, event.isBeingDecrypted(), event.isDecryptionFailure() )
		} )

	} else {
		console.log( "Unknown room.timeline??", event.getType(), room.roomId )
	}
} )

process.once( "SIGINT", () => {
	console.log( "\nGoodbye!" )

	client.stopClient()
	process.exit( 0 )
} )
