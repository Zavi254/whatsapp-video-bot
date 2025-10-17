import Ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import pLimit from "p-limit";

const limit = pLimit(2);
const TIMEOUT_MS = 180000; // 3 minutes

/**
 * Normalize or convert an audio buffer to WhatsApp-compatible .mp3
 * - Uses FFmpeg streaming pipeline (no disk I/O)
 * - Automatically skips conversion if already MP3
 * 
 * @param {Buffer|import('stream').Readable} inputBuffer - Audio data (Buffer or stream)
 * @param {string} mime - MIME type from the source
 * @returns {Promise<{ buffer: Buffer, ext: string, mime: string }>}
 */
export async function normalizeAudio(input, mime) {
    return limit(async () => {
        try {
            // if already MP3, return directly
            if (mime?.includes("audio/mpeg")) {
                if (Buffer.isBuffer(input)) {
                    return { buffer: input, ext: "mp3", mime: "audio/mpeg" };
                }
                // Convert stream to buffer
                const chunks = [];
                for await (const chunk of input) chunks.push(chunk);
                return { buffer: Buffer.concat(chunks), ext: "mp3", mime: "audio/mpeg" };
            }

            // Wrap FFmpeg process in a promise
            return new Promise((resolve, reject) => {
                const command = Ffmpeg(input)
                    .audioCodec("libmp3lame")
                    .audioBitrate("128k")
                    .format("mp3")

                const outputStream = new PassThrough();
                const chunks = [];


                command.on("error", (err) => {
                    clearTimeout(timeout);
                    reject(err);
                })
                command.on("end", () => {
                    clearTimeout(timeout);
                });

                // pipe output
                command.pipe(outputStream, { end: true });

                // Collect output chunks
                outputStream.on("data", (chunk) => chunks.push(chunk));
                outputStream.on("end", () => {
                    resolve({
                        buffer: Buffer.concat(chunks),
                        ext: "mp3",
                        mime: "audio/mpeg"
                    });
                });
                outputStream.on("error", reject);

                // timeout protection
                const timeout = setTimeout(() => {
                    try { command.kill("SIGKILL"); } catch { }
                    reject(new Error("FFmpeg conversion timed out"));
                }, TIMEOUT_MS)
            })
        } catch (error) {
            console.error("normalizeAudio error:", error);
            throw error;
        }
    });
}
