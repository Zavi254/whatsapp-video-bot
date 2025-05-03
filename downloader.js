const { SnapSaver } = require('snapsaver-downloader');
const axios = require('axios');

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

        if (result.success && result.data?.media?.length > 0) {
            const videoUrl = result.data.media.find(m => m.type === 'video')?.url;

            if (videoUrl) {
                const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);

                await sock.sendMessage(jid, {
                    video: buffer,
                    caption: `🎬 Here is your ${platform} video!`
                });
            } else {
                await sock.sendMessage(jid, { text: `❌ No downloadable video found in ${platform} link.` });
            }
        } else {
            await sock.sendMessage(jid, { text: `❌ Failed to retrieve video from ${platform}.` });
        }
    } catch (error) {
        console.error(`❗ Download error from ${platform}:`, error);
        await sock.sendMessage(jid, {
            text: `⚠️ Error occurred while downloading from ${platform}.`
        });
    }

}

module.exports = { handleDownloadLink }