import { SnapSaver } from "snapsaver-downloader";
import { downloadAndSendVideo } from "../utils/downloadVideo.js";

export async function handleSnapSaver(sock, jid, msg, url, platform) {
    const result = await SnapSaver(url);

    if (!result.success || !result.data?.media?.length) {
        await sock.sendMessage(jid, { text: `Failed to retrieve video from ${platform}` });
        return;
    }

    const videoMedia = result.data.media.find(m => m.type === "video");
    const videoUrl = videoMedia?.url;

    if (!videoUrl) {
        await sock.sendMessage(jid, { text: `Invalid or missing video URL from ${platform}.` });
        return;
    }

    await downloadAndSendVideo(sock, jid, msg, videoUrl, platform);

}