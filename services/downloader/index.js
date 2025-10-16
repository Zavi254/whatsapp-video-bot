import { isSupportedVideoLink, detectPlatform } from "./utils/helpers.js";
import { platformHandlers } from "./platforms/index.js";

export async function handleDownloadLink(sock, text, jid, msg) {
    if (!isSupportedVideoLink(text)) return;

    const platform = detectPlatform(text);
    console.log(`🔍 Detected ${platform} link`);

    await sock.sendMessage(jid, {
        text: `⏳ Your ${platform} video is loading...`
    }, { quoted: msg });

    try {
        const handler = platformHandlers[platform];
        if (handler) {
            await handler(sock, jid, msg, text, platform);
        } else {
            await sock.sendMessage(jid, {
                text: `❌ Unsupported platform" ${platform}`
            });
        }
    } catch (error) {
        console.error(`❗Error handling ${platform} download:`, error);
        await sock.sendMessage(jid, {
            text: `An error occured while downloading from ${platform}.`
        });
    }

}