global.crypto = require('crypto').webcrypto;
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys')
const { Boom } = require('@hapi/boom')
const { handleDownloadLink } = require('./downloader');

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

        await handleDownloadLink(sock, text, jid, msg);
    })
}

startBot();