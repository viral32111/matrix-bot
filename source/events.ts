// Import the Matrix SDK
import { ClientEvent, MatrixEventEvent, RoomEvent, RoomMemberEvent } from "matrix-js-sdk"
import { SyncState } from "matrix-js-sdk/lib/sync.js"

// Import from main script
import { commandLineFlags, deviceIdentifier, matrixClient, userIdentifier } from "./main.js"

// Do an initial sync with the homeserver
matrixClient.once( ClientEvent.Sync, async ( state ) => {
	if ( state === SyncState.Prepared ) {
		console.log( "Synced with server, we are now ready!" )

		// Set our display name if the command-line flag is set
		const setDisplayNameFlag: string | null | undefined = commandLineFlags[ "set-display-name" ]
		if ( setDisplayNameFlag !== undefined ) {
			if ( setDisplayNameFlag === null || setDisplayNameFlag.length <= 0 ) throw new Error( "Display name must not be null or empty" )

			await matrixClient.setDisplayName( "Bot" )
			console.log( "Set display name to '%s'", setDisplayNameFlag )
		}

		// List information about the rooms we are in
		const rooms = matrixClient.getRooms()
		console.log( "Found %d rooms", rooms.length )
		for ( const room of rooms ) {
			console.log( "\tRoom '%s' with %d members", room.name, room.getJoinedMembers().length )
			for ( const roomMember of room.getJoinedMembers() ) {
				console.log( "\t\tMember '%s'", roomMember.name )
				//await matrixClient.downloadKeys( [ roomMember.userId ] ) // Fetch member keys
			}
		}

		// Set our device human-readable name
		const deviceDisplayName = "Matrix Bot"
		if ( deviceIdentifier === undefined ) throw new Error( "Device identifier is undefined?" )
		await matrixClient.setDeviceDetails( deviceIdentifier, {
			display_name: deviceDisplayName
		} )
		console.log( "Set display name of device '%s' to '%s'", deviceIdentifier, deviceDisplayName )

		// TODO: Many of the events below are called for historical events, so we should register them here to avoid that

	// Die if we got anything other than the initial sync
	} else {
		console.warn( "Unknown sync state: '%s'", state )
		process.exit( 1 )
	}
} )

// Room event...
matrixClient.on( RoomEvent.Timeline, async ( event, room, toStartOfTimeline ) => {
	if ( room === undefined ) throw new Error( "Room is undefined in RoomEvent.Timeline event handler" )
	console.debug( "Room '%s' got new TIMELINE event: %s (%s, %s)", room.name, event.getType(), toStartOfTimeline, event.isEncrypted() )

	// Message was sent...
	if ( event.getType() === "m.room.message" && toStartOfTimeline === false ) {
		const messageSender = event.getSender()
		const messageContent = event.getContent().body
		if ( messageSender === undefined ) throw new Error( "Message without sender?" )

		console.log( "Unencrypted message '%s' from '%s'", messageContent, messageSender )

		// Reply to ping messages
		if ( messageContent === "ping" ) {
			await matrixClient.sendTextMessage( room.roomId, "pong" )
		}

	// Encrypted message...
	} /*else if ( event.getType() == "m.room.encrypted" ) {
		const messageSender = event.getSender()
		const messageContent = event.getContent().body // Doesn't work!
		if ( messageSender === undefined ) throw new Error( "Message without sender?" )

		//await matrixClient.downloadKeys( [ messageSender ] )

		console.log( "Encrypted message '%s' from '%s'", messageContent, messageSender )
	}*/
} )

// Decryption event...
matrixClient.on( MatrixEventEvent.Decrypted, ( event ) => {
	if ( event.isDecryptionFailure() === true ) {
		console.warn( "Failed to decrypt event: %s", event.getType() )
		return
	}

	console.debug( "Decrypted event: %s", event.getType() )

	if ( event.getType() == "m.room.message" ) {
		const messageSender = event.getSender()
		const messageContent = event.getContent().body
		if ( messageSender === undefined ) throw new Error( "Message without sender?" )

		console.log( "Encrypted message '%s' from '%s'", messageContent, messageSender )
	}
} )

// Room member event...
matrixClient.on( RoomMemberEvent.Membership, async ( event, member ) => {
	console.debug( "Member '%s' got new MEMBERSHIP event: %s", member.name, event.getType() )

	if ( member.membership === "invite" && member.userId === userIdentifier ) {
		console.log( "We've been invited to room '%s'", member.roomId )

		// Just join the room, to make life easier
		await matrixClient.joinRoom( member.roomId )
		console.log( "Joined room '%s'", member.roomId )
	}
} )

// Room member typing event...
matrixClient.on( RoomMemberEvent.Typing, ( event, member ) => {
	console.debug( "Member '%s' got new TYPING event: %s", member.name, event.getType() )

	if ( member.typing ) {
		console.log( "Member '%s' started typing..." )
	} else {
		console.log( "Member '%s' stopped typing..." )
	}
} )
