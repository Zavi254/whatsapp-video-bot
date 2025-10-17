import Ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";
import { join } from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import pLimit from "p-limit";

// Limit concurrent FFmpeg jobs to 3
const limit = pLimit(3);

// Maximum conversion time (ms)
const TIMEOUT_MS = 60000;

/**
 * Ensures the audio buffer is in a Whatsapp-compatible format (.mp3 or .m4a)
 * @param {Buffer} inputBuffer - Raw downloaded audio buffer
 * @param {string} mime - Original MIME type from the server
 * @returns {Promise<{buffer: Buffer, ext: string, mime: string}>}
 */

export async function normalizeAudio(inputBuffer, mime) {
    return limit(async () => {
        const tmpInput = join(tmpdir(), `${randomUUID()}.input`);
        const tmpOutput = join(tmpdir(), `${randomUUID()}.m4a`);

        await fs.writeFile(tmpInput, inputBuffer);

        const ffmpegPromise = new Promise((resolve, reject) => {
            const command = Ffmpeg(tmpInput)
                .audioCodec("aac")
                .audioBitrate("128k")
                .format("ipod")
                .on("error", (err) => reject(err))
                .on("end", async () => {
                    try {
                        const outBuffer = await fs.readFile(tmpOutput);
                        await fs.unlink(tmpInput).catch(() => { });
                        await fs.unlink(tmpOutput).catch(() => { });
                        resolve({
                            buffer: outBuffer,
                            ext: "m4a",
                            mime: "audio/mp4"
                        });
                    } catch (readErr) {
                        reject(readErr);
                    }
                })
                .save(tmpOutput);

            // Add a hard timeout (kill process if it runs too long)
            const timeout = setTimeout(() => {
                try {
                    command.kill("SIGKILL");
                } catch { }
                reject(new Error("FFmpeg conversion timed out"));
            }, TIMEOUT_MS);

            // clear timeout if FFmpeg finishes early
            command.on("end", () => clearTimeout(timeout));
            command.on("error", () => clearTimeout(timeout));
        });

        return ffmpegPromise;
    });
}