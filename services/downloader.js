import { SnapSaver } from 'snapsaver-downloader';
import Tiktok from "@tobyg74/tiktok-api-dl";
import { twitter as twitterDownloader } from 'btch-downloader';
import axios from 'axios';

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const isSupportedVideoLink = (text) => {
    const urlPatterns = [
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/?\?v=\d+/i,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/v\/[A-Za-z0-9]+/i,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/share\/r\/[A-Za-z0-9]+/i,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[^\/]+\/videos\/\d+/i,
        /(?:https?:\/\/)?fb\.watch\/[A-Za-z0-9]+/i,
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+/i,
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^\/]+\/video\/\d+/i,
        /(?:https?:\/\/)?vt\.tiktok\.com\/[A-Za-z0-9]+/i,
        /(?:https?:\/\/)?vm\.tiktok\.com\/[A-Za-z0-9]+/i,
        /(?:https?:\/\/)?(?:www\.)?(twitter|x)\.com\/[A-Za-z0-9_]+\/status\/\d+/i
    ];
    return urlPatterns.some((regex) => regex.test(text));
}

const detectPlatform = (url) => {
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('tiktok.com') || url.includes('vt.tiktok.com')) return 'Tiktok';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
    return 'Video';
}

export async function downloadAndSendVideo(sock, jid, msg, videoUrl, platform, customHeaders = null) {
    try {
        const headers = customHeaders || {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://www.tiktok.com'
        };

        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream',
            headers
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

export async function handleDownloadLink(sock, text, jid, msg) {
    if (!isSupportedVideoLink(text)) return;

    const platform = detectPlatform(text);
    console.log(`🔍 Detected ${platform} link`);

    await sock.sendMessage(jid, {
        text: `⏳ Please wait, downloading your ${platform} video...`
    }, { quoted: msg });

    try {
        if (platform === 'Tiktok') {
            const response = await Tiktok.Downloader(text, {
                version: 'v2',
                showOriginalResponse: true
            });

            if (response.status !== "success" ||
                !response.result ||
                response.result.type !== "video" ||
                !response.result.video?.playAddr?.length) {
                await sock.sendMessage(jid, { text: `❌ Failed to retrieve the Tiktok video` })
                return;
            }

            const videoUrl = response.result.video.playAddr[0];
            await downloadAndSendVideo(sock, jid, msg, videoUrl, platform)

        } else if (platform === 'Twitter') {
            // normalize x.com -> twitter.com
            const normalizedUrl = text.replace(/https?:\/\/x\.com/i, 'https://twitter.com');
            try {
                const twitterResponse = await twitterDownloader(normalizedUrl);

                if (!twitterResponse?.status || !Array.isArray(twitterResponse.url) || !twitterDownloader.url?.length) {
                    await sock.sendMessage(jid, { text: `❌ Failed to retrieve the Twitter video.` })
                    return;
                }

                // prefers HD video, fallback to SD if it's a proper Mp4
                let videoData = twitterResponse.url.find(u => u.hd)
                    || twitterResponse.url.find(u => u.sd?.endsWith('.mp4'));

                if (!videoData) {
                    await sock.sendMessage(jid, { text: `❌ No valid video found on Twitter.` });
                    return;
                }

                const videoUrl = videoData.hd || videoData.sd;

                if (!videoUrl) {
                    await sock.sendMessage(jid, { text: `❌ Video URL missing.` });
                    return;
                }

                const headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': 'https://twitter.com'
                };

                await downloadAndSendVideo(sock, jid, msg, videoUrl, platform, headers);

            } catch (error) {
                console.error(`❗Error downloading Twitter video:`, error);
                await sock.sendMessage(jid, {
                    text: `⚠️ An error occurred while downloading the Twitter video.`
                });
            }


        } else {
            const result = await SnapSaver(text);

            console.log('SnapSaver result:', JSON.stringify(result, null, 2))

            if (!result.success || !result.data?.media?.length) {
                await sock.sendMessage(jid, { text: `❌ Failed to retrieve video from ${platform}.` })
                return;
            }

            const videoMedia = result.data.media.find(m => m.type === 'video');
            const videoUrl = videoMedia?.url;

            if (!videoUrl) {
                await sock.sendMessage(jid, { text: `❌ Invalid or missing video URL from ${platform}.` });
                return;
            }
            await downloadAndSendVideo(sock, jid, msg, videoUrl, platform)

        }
    } catch (error) {
        console.error(`❗Error handling ${platform} download:`, error);
        await sock.sendMessage(jid, {
            text: `⚠️ An error occured while downloading from ${platform}.`
        })
    }
}
