import fs from "fs/promises";
import crypto from "crypto";
import path from "path";

export async function getFileHash(filePath) {
    const buffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function getFolderHashes(folderPath) {
    const files = await fs.readdir(folderPath);
    const hashes = {};

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
            hashes[file] = await getFileHash(filePath);
        }
    }

    return hashes;
}