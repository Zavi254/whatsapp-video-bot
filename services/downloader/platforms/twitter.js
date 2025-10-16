import { twitter as twitterDownloader } from "btch-downloader";
import { MAX_VIDEO_SIZE } from "../constants.js";
import axios from "axios";

export async function handleTwitter(sock, jid, msg, url) {
    try {
        const normalizedUrl = url.replace(/https?:\/\/x\.com/i, 'https://twitter.com');

        const twitterResponse = await twitterDownloader(normalizedUrl);

        if (!twitterResponse?.status || !Array.isArray(twitterResponse.url) || !twitterResponse.url.length) {
            console.error('❌ Invalid response from btch-downloader:', twitterResponse);
            await sock.sendMessage(jid, { text: `❌ Failed to retrieve the Twitter video.` }, { quoted: msg });
            return;
        }

        // prefer HD, fallback to SD
        const videoData = twitterResponse.url.find(v => v.hd) || twitterResponse.url[0];
        const videoUrl = videoData.hd || videoData.sd;

        if (!videoUrl) {
            await sock.sendMessage(jid, { text: `No downloadable video found from Twitter` }, { quoted: msg });
            return;
        }

        // HEAD request -> check Content-Length
        const headResp = await axios.head(videoUrl, { validateStatus: () => true });
        const contentLength = parseInt(headResp.headers['content-length'] || '0', 10);

        if (contentLength && contentLength > MAX_VIDEO_SIZE) {
            console.warn(`⚠️ Twitter video is too large (${(contentLength / 1024 / 1024).toFixed(2)} MB)`);
            await sock.sendMessage(
                jid,
                { text: `⚠️ The Twitter video is too large to download (limit: 50MB).` },
                { quoted: msg }
            );
            return;
        }

        // use simpler axios GET (Twitter video URLs are direct)
        const response = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: MAX_VIDEO_SIZE,
            validateStatus: status => status >= 200 && status < 400
        });

        const videoBuffer = Buffer.from(response.data);

        // send to user
        await sock.sendMessage(
            jid,
            {
                video: videoBuffer,
                caption: `📽️Here is your Twitter video!`
            },
            { quoted: msg }
        );

        console.log(`✅ Sent Twitter video (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    } catch (error) {
        console.error('Twitter download error:', error.message || error);

        if (error.code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' || error.response?.status === 413) {
            await sock.sendMessage(jid, {
                text: '⚠️ The video is too large to download (limit is 50MB).'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, {
                text: `⚠️ Failed to download Twitter video. Please try again later.`
            }, { quoted: msg })
        }

    }
}