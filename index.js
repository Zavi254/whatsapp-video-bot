global.crypto = require('crypto').webcrypto;
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys')
const { Boom } = require('@hapi/boom')
const { SnapSaver } = require('snapsaver-downloader')
const axios = require('axios');

async function startBot() {
    // Load auth from the 'auth' folder
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    // Create whatsapp socket
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    })

    // save credentials when they update
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const error = lastDisconnect?.error;

            // Check for Boom error or safely access statusCode
            const statusCode = error instanceof Boom
                ? error.output.statusCode
                : error?.output?.statusCode; // fallback if not strictly Boom

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log('❌ Connection closed. Reconnect?', shouldReconnect);

            if (shouldReconnect) {
                startBot(); // restart socket
            } else {
                console.log('👋 Logged out -- will not reconnect automatically.')
            }

        } else if (connection === 'open') {
            console.log('✅ Logged in and ready!')
        }
    })

    // listen for messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || msg.key.fromMe) return

        // Gets the text of the message and the chat ID (phone number in whatsapp format)
        const text = msg.message.conversation || '';
        const jid = msg.key.remoteJid;

        console.log('📩 Received message:', text)

        if (text.includes('facebook.com')) { // checks if the message contains a FB video link

            try {
                console.log('Detected Facebook link:', text)

                // Send "please wait" message once
                await sock.sendMessage(jid, { text: '⏳ Please wait, I am downloading your video...' }, { quoted: msg })

                const result = await SnapSaver(text);
                if (result.success && result.data?.media?.length > 0) {
                    const videoUrl = result.data.media.find(m => m.type === 'video')?.url;
                    if (videoUrl) {
                        // Donwloads the video as binary data(Buffer), which can be sent over whatsapp
                        const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
                        const buffer = Buffer.from(response.data);

                        await sock.sendMessage(jid, {
                            video: buffer,
                            caption: 'Here is your video 🎬'
                        })

                    } else {
                        await sock.sendMessage(jid, { text: 'Failed to retrieve video from SnapSave.' })
                    }
                } else {
                    await sock.sendMessage(jid, { text: 'Failed to get video from SnapSave' })
                }

            } catch (error) {
                console.error('Download error:', error);
                await sock.sendMessage(jid, { text: 'An error occured while processing the link.' })
            }

        }
    })
}

startBot();