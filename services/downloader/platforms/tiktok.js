import Tiktok from "@tobyg74/tiktok-api-dl";
import { downloadAndSendVideo } from "../utils/downloadVideo.js";

export async function handleTiktok(sock, jid, msg, url) {
    const response = await Tiktok.Downloader(url, {
        version: 'v2',
        showOriginalResponse: true
    });

    if (
        response.status !== "success" ||
        !response.result ||
        response.result.type !== "video" ||
        !response.result.video?.playAddr?.length
    ) {
        await sock.sendMessage(jid, { text: `Failed to retrieve the Tiktok video` })
        return;
    }

    const videoUrl = response.result.video.playAddr[0];
    await downloadAndSendVideo(sock, jid, msg, videoUrl, 'TikTok');
}