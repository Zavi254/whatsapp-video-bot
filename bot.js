import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import pino from 'pino';
import qrcode from "qrcode-terminal";
import { Boom } from '@hapi/boom';

import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} from "baileys";

import { handleDownloadLink } from './services/downloader.js';
import { downloadAuthFolder, uploadAuthFolder } from './services/supabase.js';
import { uploadQRToSupabase } from './services/uploadQRToSupabase.js';

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
    try {
        console.log('☁️ Downloading auth folder from Supabase...')
        await downloadAuthFolder('./auth'); // download to a local folder

        const { state, saveCreds } = await useMultiFileAuthState('./auth')
        const { version, isLatest } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'info' }),
            browser: ["Ubuntu", "Chrome", "120.0.0.0"],
            syncFullHistory: false,
            markOnlineOnConnect: false
        });

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
                qrcode.generate(qr, { small: true });
                const qrUrl = await uploadQRToSupabase(qr);
                console.log(qrUrl ? `Scan QR here: ${qrUrl}` : '⚠️ Failed to upload QR code.')
            }

            if (connection === 'open') {
                console.log('✅ WhatsApp connection established successfully!')
            }

            if (connection === 'close') {
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`❌ Connection closed. Reconnect? ${shouldReconnect}`);

                if (shouldReconnect) {
                    setTimeout(startBot, 5000);
                } else {
                    console.log('👋 Logged out. Please rescan the QR code.')
                }
            }
        });

        // Handle new messages
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg) return;

            const jid = msg.key.remoteJid;
            const text = extractMessageText(msg);
            console.log('📩 Extracted message:', text || '[empty message]');
            await handleDownloadLink(sock, text, jid, msg);
        })
    } catch (error) {
        console.error('Fatal error in startBot():', error);
        setTimeout(startBot, 5000)
    }

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