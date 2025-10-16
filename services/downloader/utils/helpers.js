export const isSupportedVideoLink = (text) => {
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
};

export const detectPlatform = (url) => {
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('tiktok.com') || url.includes('vt.tiktok.com')) return 'Tiktok';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
    return 'Video';
};