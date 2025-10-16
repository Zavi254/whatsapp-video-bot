import axios from "axios";

export async function waitForVideoUrl(url, headers = {}, maxRetries = 5, delayMs = 2000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const head = await axios.head(url, {
                headers,
                maxRedirects: 5,
                timeout: 5000
            });

            if (head.status === 200 && head.headers['content-type']?.startsWith('video')) {
                return true; // video is ready
            }

        } catch (error) {
            // something went wrong (network error, 404)
            console.warn(`Attempt ${i + 1} failed for URL: ${url} - ${error.message || error}`)
        }

        await new Promise(res => setTimeout(res, delayMs));
    }
    return false;
}