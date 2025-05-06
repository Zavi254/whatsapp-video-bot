global.crypto = require('crypto').webcrypto;
require('dotenv').config();
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys')
const { Boom } = require('@hapi/boom')
const { handleDownloadLink } = require('./downloader');
const { downloadAuthFolder, uploadAuthFolder } = require('./supabase')
const { uploadQRToSupabase } = require('./uploadQRToSupabase')

const app = express();

const extractMessageText = (msg) => {
    try {
        if (!msg.message || typeof msg.message !== 'object') return '';

        const messageType = Object.keys(msg.message)[0];
        const content = msg.message[messageType];

        switch (messageType) {
            case 'conversation':
                return content;
            case 'extendedTextMessage':
                return content.text;
            case 'imageMessage':
            case 'videoMessage':
                return content.caption || '';
            case 'buttonsResponseMessage':
                return content.selectedButtonId || '';
            case 'listResponseMessage':
                return content.singleSelectReply?.selectedRowId || '';
            case 'templateButtonReplyMessage':
                return content.selectedId || '';
            default:
                return '';
        }
    } catch (err) {
        console.error('❗ Error extracting message text:', err);
        return '';
    }
};


async function startBot() {
    console.log('☁️ Downloading auth credentials from Supabase...')
    await downloadAuthFolder('./auth'); // download to a local folder

    // Load auth from the 'auth' folder
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    // Create whatsapp socket
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    })

    // save credentials when they update
    sock.ev.on('creds.update', async () => {
        await saveCreds();
        console.log('☁️ Uploading updated creds to Supabase...');
        await uploadAuthFolder('./auth');
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            console.log('🔁 Received QR code, uploading image...');

            const qrUrl = await uploadQRToSupabase(qr);
            if (qrUrl) {
                console.log(`🔗 Scan your QR here: ${qrUrl}`);
            } else {
                console.log('⚠️ Failed to upload QR code.');
            }
        }

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
        // if (!msg || msg.key.fromMe) return
        if (!msg) return;

        // Gets the text of the message and the chat ID (phone number in whatsapp format)
        const messageContent = JSON.stringify(msg, null, 2);
        const jid = msg.key.remoteJid;

        // console.log('📦 Raw message data:', messageContent);

        const text = extractMessageText(msg);
        console.log('📩 Extracted message:', text || '[empty message]');

        await handleDownloadLink(sock, text, jid, msg);
    })
}

startBot();

app.get('/health', (req, res) => {
    res.status(200).send('🤖 Bot is running!');
})

app.use((req, res, next) => {
    if (req.path === '/health') {
        console.debug = () => { };
        console.log = () => { }
    }
    next();
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});