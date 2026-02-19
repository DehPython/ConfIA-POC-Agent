# API Reference: whatsapp-web.js

## 1. Client Class
Starting point for interacting with the WhatsApp Web API. Extends `EventEmitter`.

### Constructor Options
- `authStrategy`: Determines how to save and restore sessions. Will use LegacySessionAuth if options.session is set. Otherwise, NoAuth will be used.
- `webVersion`: The version of WhatsApp Web to use. Use options.webVersionCache to configure how the version is retrieved.
- `webVersionCache`: Determines how to retrieve the WhatsApp Web version. Defaults to a local cache (LocalWebCache) that falls back to latest if the requested version is not found.
- `authTimeoutMs`: Timeout for authentication selector in puppeteer.
- `puppeteer`: Puppeteer launch options.
- `qrMaxRetries`: How many times should the qrcode be refreshed before giving up.
- `restartOnAuthFail` **(DEPRECATED)**: This option should be set directly on the LegacySessionAuth.
- `session` **(DEPRECATED)**: Only here for backwards-compatibility. You should move to using LocalAuth, or set the authStrategy to LegacySessionAuth explicitly.
- `takeoverOnConflict`: If another whatsapp web session is detected (another browser), take over the session in the current browser.
- `takeoverTimeoutMs`: How much time to wait before taking over the session.
- `userAgent`: User agent to use in puppeteer.
- `ffmpegPath`: Ffmpeg path to use when formatting videos to webp while sending stickers.
- `bypassCSP`: Sets bypassing of page's Content-Security-Policy.
- `proxyAuthentication`: Proxy Authentication object.

### Methods
- `initialize()`: Sets up events and requirements, kicks off authentication request.
- `destroy()`: Closes the client.
- `logout()`: Logs out the client, closing the current session.
- `sendMessage(chatId, content, options?)`: Send a message to a specific chatId. Content can be string, MessageMedia, Location, Poll, Contact, Buttons or List.
- `requestPairingCode(phoneNumber, showNotification?, intervalMs?)`: Request authentication via pairing code instead of QR code. Returns a pairing code in format "ABCDEFGH".
- `getChatById(chatId)`: Gets chat or channel instance by ID.
- `getContactById(contactId)`: Get contact instance by ID.
- `getContacts()`: Get all current contact instances.
- `getChats()`: Get all current chat instances.
- `getChannels()`: Gets all cached Channel instances.
- `getWWebVersion()`: Returns the version of WhatsApp Web currently being run.
- `sendSeen(chatId)`: Mark as seen for the Chat.
- `setStatus(status)`: Sets the current user's status message.
- `setDisplayName(displayName)`: Sets the current user's display name.
- `getState()`: Gets the current connection state for the client.
- `sendPresenceAvailable()`: Marks the client as online.
- `sendPresenceUnavailable()`: Marks the client as unavailable.
- `archiveChat(chatId)`: Enables and returns the archive state of the Chat.
- `unarchiveChat(chatId)`: Changes and returns the archive state of the Chat.
- `pinChat(chatId)`: Pins the Chat.
- `unpinChat(chatId)`: Unpins the Chat.
- `muteChat(chatId, unmuteDate?)`: Mutes this chat forever, unless a date is specified.
- `unmuteChat(chatId)`: Unmutes the Chat.
- `markChatUnread(chatId)`: Mark the Chat as unread.
- `getProfilePicUrl(contactId)`: Returns the contact ID's profile picture URL, if privacy settings allow it.
- `getCommonGroups(contactId)`: Gets the Contact's common groups with you.
- `resetState()`: Force reset of connection state for the client.
- `isRegisteredUser(id)`: Check if a given ID is registered in whatsapp.
- `getNumberId(number)`: Get the registered WhatsApp ID for a number. Will return null if not registered.
- `getFormattedNumber(number)`: Get the formatted number of a WhatsApp ID.
- `getCountryCode(number)`: Get the country code of a WhatsApp ID.
- `createGroup(title, participants, options)`: Creates a new group.
- `createChannel(title, options)`: Creates a new channel.

### Events
- `qr`: Emitted when a QR code is received.
- `authenticated`: Emitted when authentication is successful.
- `auth_failure`: Emitted when there has been an error while trying to restore an existing session.
- `ready`: Emitted when the client has initialized and is ready to receive messages.
- `message`: Emitted when a new message is received.
- `message_create`: Emitted when a new message is created, which may include the current user's own messages.
- `message_revoke_everyone`: Emitted when a message is deleted for everyone in the chat.
- `message_revoke_me`: Emitted when a message is deleted by the current user.
- `message_ack`: Emitted when an ack event occurrs on message type.
- `message_edit`: Emitted when messages are edited.
- `message_ciphertext`: Emitted when messages are edited (ciphertext).
- `message_reaction`: Emitted when a reaction is sent, received, updated or removed.
- `group_join`: Emitted when a user joins the chat via invite link or is added by an admin.
- `group_leave`: Emitted when a user leaves the chat or is removed by an admin.
- `group_update`: Emitted when group settings are updated, such as subject, description or picture.
- `disconnected`: Emitted when the client has been disconnected.
- `change_state`: Emitted when the connection state changes.
- `contact_changed`: Emitted when a contact or a group participant changes their phone number.
- `incoming_call`: Emitted when a call is received.
- `change_battery` **(DEPRECATED)**: Emitted when the battery percentage for the attached device changes.

---

## 2. Message Class
Represents a Message on WhatsApp.

### Properties
- `id`: ID that represents the message.
- `ack`: ACK status for the message.
- `hasMedia`: Indicates if the message has media available for download.
- `body`: Message content.
- `type`: Message type.
- `timestamp`: Unix timestamp for when the message was created.
- `from`: ID for the Chat that this message was sent to, except if the message was sent by the current user.
- `to`: ID for who this message is for.
- `author`: If the message was sent to a group, this field will contain the user that sent the message.
- `deviceType`: String that represents from which device type the message was sent.
- `isForwarded`: Indicates if the message was forwarded.
- `forwardingScore`: Indicates how many times the message was forwarded.
- `isStatus`: Indicates if the message is a status update.
- `isStarred`: Indicates if the message was starred.
- `broadcast`: Indicates if the message was a broadcast.
- `fromMe`: Indicates if the message was sent by the current user.
- `hasQuotedMsg`: Indicates if the message was sent as a reply to another message.
- `hasReaction`: Indicates whether there are reactions to the message.
- `location`: Location information contained in the message.
- `vCards`: List of vCards contained in the message.
- `inviteV4`: Group Invite Data.
- `mentionedIds`: Indicates the mentions in the message body.
- `groupMentions`: Indicates whether there are group mentions in the message body.

### Methods
- `reload()`: Reloads this Message object's data in-place with the latest values from WhatsApp Web.
- `rawData()`: Returns message in a raw format.
- `getChat()`: Returns the Chat this message was sent in.
- `getContact()`: Returns the Contact this message was sent from.
- `getMentions()`: Returns the Contacts mentioned in this message.
- `getQuotedMessage()`: Returns the quoted message, if any.
- `reply(content, chatId?, options?)`: Sends a message as a reply to this message.
- `react(reaction)`: React to this message with an emoji. Send empty string to remove.
- `forward(chat)`: Forwards this message to another chat.
- `downloadMedia()`: Downloads and returns the attached message media.
- `delete(everyone?, clearMedia?)`: Deletes a message from the chat.
- `star()` / `unstar()`: Stars/unstars the message.
- `pin(duration)`: Pins the message.
- `unpin()`: Unpins the message.
- `getInfo()`: Get information about message delivery status.
- `getOrder()`: Gets the order associated with a given message.
- `getPayment()`: Gets the payment details associated with a given message.
- `getReactions()`: Gets the reactions associated with the given message.
- `edit(content, options?)`: Edits the current message.

---

## 3. Chat & GroupChat Classes
`GroupChat` extends `Chat`.

### Chat Methods
- `id`: ID that represents the chat.
- `name`: Title of the chat.
- `isGroup`: Indicates if the Chat is a Group Chat.
- `isReadOnly`: Indicates if the Chat is readonly.
- `unreadCount`: Amount of messages unread.
- `timestamp`: Unix timestamp for when the last activity occurred.
- `archived`: Indicates if the Chat is archived.
- `pinned`: Indicates if the Chat is pinned.
- `isMuted`: Indicates if the chat is muted or not.
- `muteExpiration`: Unix timestamp for when the mute expires.
- `lastMessage`: Last message of chat.
- `sendMessage(content, options?)`: Send a message to this chat.
- `sendSeen()`: Sets the chat as seen.
- `clearMessages()`: Clears all messages from the chat.
- `delete()`: Deletes the chat.
- `archive()` / `unarchive()`: Archives/unarchives this chat.
- `pin()` / `unpin()`: Pins/unpins this chat.
- `mute(unmuteDate?)`: Mutes this chat forever, unless a date is specified.
- `unmute()`: Unmutes this chat.
- `markUnread()`: Mark this chat as unread.
- `getContact()`: Returns the Contact that corresponds to this Chat.
- `getLabels()`: Returns array of all Labels assigned to this Chat.

### GroupChat Methods
- `owner`: Gets the group owner.
- `createdAt`: Gets the date at which the group was created.
- `description`: Gets the group description.
- `participants`: Gets the group participants.
- `addParticipants(participantIds, options?)`: Adds a list of participants by ID to the group.
- `removeParticipants(participantIds)`: Removes a list of participants by ID to the group.
- `promoteParticipants(participantIds)`: Promotes participants by IDs to admins.
- `demoteParticipants(participantIds)`: Demotes participants by IDs to regular users.
- `setSubject(subject)`: Updates the group subject.
- `setDescription(description)`: Updates the group description.
- `setAddMembersAdminsOnly(value)`: Updates the group setting to allow only admins to add members.
- `setMessagesAdminsOnly(value)`: Updates the group settings to only allow admins to send messages.
- `setInfoAdminsOnly(value)`: Updates the group settings to only allow admins to edit group info.
- `getInviteCode()`: Gets the invite code for a specific group.
- `revokeInvite()`: Invalidates the current group invite code and generates a new one.
- `leave()`: Makes the bot leave the group.

---

## 4. Contact Class
Represents a Contact on WhatsApp.

### Properties
- `id`: ID that represents the contact.
- `number`: Contact's phone number.
- `isBusiness`: Indicates if the contact is a business contact.
- `isEnterprise`: Indicates if the contact is an enterprise contact.
- `name`: The contact's name, as saved by the current user.
- `pushname`: The name that the contact has configured to be shown publically.
- `shortName`: A shortened version of name.
- `isMe`: Indicates if the contact is the current user's contact.
- `isUser`: Indicates if the contact is a user contact.
- `isGroup`: Indicates if the contact is a group contact.
- `isWAContact`: Indicates if the number is registered on WhatsApp.
- `isMyContact`: Indicates if the number is saved in the current phone's contacts.
- `isBlocked`: Indicates if you have blocked this contact.

### Methods
- `getProfilePicUrl()`: Returns the contact's profile picture URL, if privacy settings allow it.
- `getFormattedNumber()`: Returns the contact's formatted phone number.
- `getCountryCode()`: Returns the contact's countrycode.
- `getChat()`: Returns the Chat that corresponds to this Contact.
- `getAbout()`: Gets the Contact's current "about" info.
- `block()` / `unblock()`: Blocks/unblocks this contact from WhatsApp.
- `getCommonGroups()`: Gets the Contact's common groups with you.

---

## 5. Other Structures

### MessageMedia
Media attached to a message.
- `mimetype`: MIME type of the attachment.
- `data`: Base64-encoded data of the file.
- `filename`: Document file name.
- `filesize`: Document file size in bytes.
- `static fromFilePath(filePath)`: Creates a MessageMedia instance from a local file path.
- `static fromUrl(url, options?)`: Creates a MessageMedia instance from a URL.

### ClientInfo
Current connection information.
- `pushname`: Name configured to be shown in push notifications.
- `wid`: Current user ID.
- `me` **(DEPRECATED)**: Use .wid instead.
- `phone` **(DEPRECATED)**: Information about the phone this client is connected to. Not available in multi-device.
- `platform`: Platform WhatsApp is running on.
- `getBatteryStatus()` **(DEPRECATED)**: Get current battery percentage and charging status.

---

## 6. Enums

### MessageTypes
`TEXT` ('chat'), `AUDIO` ('audio'), `VOICE` ('ptt'), `IMAGE` ('image'), `VIDEO` ('video'), `DOCUMENT` ('document'), `STICKER` ('sticker'), `LOCATION` ('location'), `CONTACT_CARD` ('vcard'), `ORDER` ('order'), `REVOKED` ('revoked'), `PRODUCT` ('product'), `POLL_CREATION` ('poll_creation').

### MessageAck
- `ACK_ERROR`: -1
- `ACK_PENDING`: 0
- `ACK_SERVER`: 1
- `ACK_DEVICE`: 2
- `ACK_READ`: 3
- `ACK_PLAYED`: 4

### WAState
`CONFLICT`, `CONNECTED`, `DEPRECATED_VERSION`, `OPENING`, `PAIRING`, `TIMEOUT`, `UNPAIRED`.
