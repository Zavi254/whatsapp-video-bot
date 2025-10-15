import fs from "fs/promises"
import path from "path";
import { fileURLToPath } from "url";
import { getFolderHashes } from "./fileHashUtil.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_HASH_FILE = path.join(__dirname, 'fileHashes.json');

export async function loadHashes(hashFile = DEFAULT_HASH_FILE) {
    try {
        const content = await fs.readFile(hashFile, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        return {};
    }
}

export async function saveHashes(hashes, hashFile = DEFAULT_HASH_FILE) {
    await fs.writeFile(hashFile, JSON.stringify(hashes, null, 2));
}

export async function getChangedFiles(folderPath, hashFile = DEFAULT_HASH_FILE) {
    const [previousHashes, currentHashes] = await Promise.all([
        loadHashes(hashFile),
        getFolderHashes(folderPath)
    ]);

    const changedFiles = [];

    for (const [file, hash] of Object.entries(currentHashes)) {
        if (previousHashes[file] !== hash) {
            changedFiles.push(file);
        }
    }

    return { changedFiles, currentHashes, previousHashes };
}

export async function updateStoredHashes(newHashes, hashFile = DEFAULT_HASH_FILE) {
    await saveHashes(newHashes, hashFile);
}