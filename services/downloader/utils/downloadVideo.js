import axios from "axios";
import { MAX_VIDEO_SIZE } from "../constants.js";

export async function downloadAndSendVideo(sock, jid, msg, videoUrl, platform) {
    try {
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': `https://${platform.toLowerCase()}.com`
            }
        })

        let totalSize = 0;
        const chunks = [];

        response.data.on('data', async (chunk) => {
            totalSize += chunk.length;
            if (totalSize > MAX_VIDEO_SIZE) {
                console.warn(`⚠️ Video too large: ${totalSize} bytes`);
                response.data.destroy();
                await sock.sendMessage(jid, {
                    text: `⚠️ The videos is too large to download (limit is 50MB)`
                }, { quoted: msg })
            } else {
                chunks.push(chunk)
            }
        });

        response.data.on('end', async () => {
            if (totalSize > MAX_VIDEO_SIZE) return;
            const buffer = Buffer.concat(chunks);
            await sock.sendMessage(jid, {
                video: buffer,
                caption: `📽️ Here is your ${platform} video!`
            }, { quoted: msg })
        })

        response.data.on('error', async (err) => {
            console.error(`❗ Stream error while downloading from ${platform}:`, err.message);
            await sock.sendMessage(jid, {
                text: `⚠️ An error occurred while downloading your video.`
            });
        });

    } catch (error) {
        console.error(`❗ Video download failed from ${platform}:`, error.message);
        await sock.sendMessage(jid, {
            text: `⚠️ Could not fetch the video, Try again later.`
        })

    }
}