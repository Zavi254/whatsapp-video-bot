import { youtube as youtubeDownloader } from "btch-downloader";
import axios from "axios";
import { MAX_VIDEO_SIZE } from "../constants.js";
import { normalizeAudio } from "../utils/normalizeAudio.js";

export async function handleYouTube(sock, jid, msg, url) {
    try {
        const normalizedUrl = url.trim();

        // download metadata + mp3 link
        const ytResponse = await youtubeDownloader(normalizedUrl);

        if (!ytResponse?.status || !ytResponse.mp3) {
            console.error("Invalid response from btch-downloader:", ytResponse);
            await sock.sendMessage(
                jid,
                { text: 'Failed to retrieve the Youtube audio. Try again' },
                { quoted: msg }
            );
            return;
        }

        const audioUrl = ytResponse.mp3;

        // HEAD request to check Content-Length before downloading
        const headResp = await axios.head(audioUrl, { validateStatus: () => true });
        const contentLength = parseInt(headResp.headers["content-length"] || "0", 10);

        if (contentLength && contentLength > MAX_VIDEO_SIZE) {
            console.warn(
                `⚠️ YouTube audio too large (${(contentLength / 1024 / 1024).toFixed(2)} MB)`
            );
            await sock.sendMessage(
                jid,
                {
                    text: `⚠️ The YouTube audio is too large to download (limit: ${MAX_VIDEO_SIZE / 1024 / 1024
                        }MB).`,
                },
                { quoted: msg }
            );
            return;
        }

        // send the thumbnail preview first
        const thumbMsg = await sock.sendMessage(
            jid,
            {
                image: { url: ytResponse.thumbnail },
                caption: `🎵 *${ytResponse.title}*\n👤 ${ytResponse.author}\n\nPreparing your audio...`,
            },
            { quoted: msg }
        );

        // download the audio file as STREAM
        const response = await axios.get(audioUrl, {
            responseType: "stream",
            timeout: 60000,
            maxContentLength: MAX_VIDEO_SIZE,
            validateStatus: (status) => status >= 200 && status < 400,
        });

        const inputStream = response.data; // this a readable stream
        const mime = response.headers["content-type"] || "";

        // Normalize (stream -> mp3)
        const { buffer: normalizedBuffer, ext, mime: fixedMime } =
            await normalizeAudio(inputStream, mime);

        const fileName = `${ytResponse.title || "youtube_audio"}.${ext}`;

        // send the MP3 to the user
        await sock.sendMessage(
            jid,
            {
                document: normalizedBuffer,
                mimetype: fixedMime,
                fileName,
                caption: `🎵 *${ytResponse.title}*\n👤 ${ytResponse.author}`
            },
            { quoted: thumbMsg }
        )

        console.log(
            `✅ Sent normalized YouTube audio (${(normalizedBuffer.length / 1024 / 1024).toFixed(
                2
            )} MB): ${ytResponse.title}`
        );
    } catch (error) {
        console.error("YouTube download error:", error);

        if (error.code === "ERR_FR_MAX_BODY_LENGTH_EXCEEDED" || error.response?.status === 413) {
            await sock.sendMessage(
                jid,
                {
                    text: `⚠️ The audio file is too large to download (limit ${MAX_VIDEO_SIZE / 1024 / 1024
                        } MB).`,
                },
                { quoted: msg }
            );
        } else if (error.message?.includes("FFmpeg conversion timed out")) {
            await sock.sendMessage(
                jid,
                { text: "⚠️ Conversion took too long and was cancelled. Please try again." },
                { quoted: msg }
            );
        } else {
            await sock.sendMessage(
                jid,
                { text: "⚠️ Failed to download or convert YouTube audio. Please try again later." },
                { quoted: msg }
            );
        }
    }
}