const { SnapSaver } = require('snapsaver-downloader');
const axios = require('axios');

const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

const isSupportedVideoLink = (text) => {
    const urlPatterns = [
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/?\?v=\d+/i,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/v\/[A-Za-z0-9]+/i,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\/]+\/videos\/\d+/i,
        /(?:https?:\/\/)?fb\.watch\/[A-Za-z0-9]+/i,
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+/i,
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^\/]+\/video\/\d+/i,
        /(?:https?:\/\/)?vt\.tiktok\.com\/[A-Za-z0-9]+/i,
        /(?:https?:\/\/)?vm\.tiktok\.com\/[A-Za-z0-9]+/i
    ];

    console.log('🔍 Link match result:', urlPatterns.some((regex) => regex.test(text)), '| Text:', text);

    return urlPatterns.some((regex) => regex.test(text));
}

const detectPlatform = (url) => {
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('tiktok.com') || url.includes('vt.tiktok.com')) return 'Tiktok';
    return 'Video';
}

async function handleDownloadLink(sock, text, jid, msg) {
    if (!isSupportedVideoLink(text)) return;

    const platform = detectPlatform(text);
    console.log(`🔍 Detected ${platform} link`);

    await sock.sendMessage(jid, {
        text: `⏳ Please wait, downloading your ${platform} video...`
    }, { quoted: msg })

    try {
        const result = await SnapSaver(text);

        if (!result.success || !result.data?.media?.length) {
            await sock.sendMessage(jid, { text: `❌ Failed to retrieve video from ${platform}.` })
            return;
        }

        const videoMedia = result.data.media.find(m => m.type === 'video');
        const videoUrl = videoMedia?.url;

        if (!videoUrl || !/^https?:\/\//.test(videoUrl)) {
            await sock.sendMessage(jid, { text: `❌ Invalid or missing video URL from ${platform}.` });
            return;
        }

        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream'
        });

        let totalSize = 0;
        const chunks = [];

        response.data.on('data', (chunk) => {
            totalSize += chunk.length;
            if (totalSize > MAX_VIDEO_SIZE) {
                console.log(`⚠️ Video too large: ${totalSize} bytes`);
                response.data.destroy();
            } else {
                chunks.push(chunk)
            }
        });

        response.data.on('end', async () => {
            if (totalSize > MAX_VIDEO_SIZE) {
                await sock.sendMessage(jid,
                    {
                        text: `⚠️ The video is too large to download (limit is 20MB). Try another link.`

                    });
                return;
            }

            const buffer = Buffer.concat(chunks);

            await sock.sendMessage(jid, {
                video: buffer,
                text: `Here is your ${platform} video!`
            }, { quoted: msg })
        }
        );

        response.data.on('error', async (err) => {
            console.error(`❗ Stream error while downloading from ${platform}:`, err.message);
            await sock.sendMessage(jid, {
                text: `⚠️ An error occurred while downloading your video. Please try again later.`
            });
        });


    } catch (error) {
        console.error(`❗ Download error from ${platform}:`, error);
        await sock.sendMessage(jid, {
            text: `⚠️ Error occurred while downloading from ${platform}.`
        });
    }

}

module.exports = { handleDownloadLink }