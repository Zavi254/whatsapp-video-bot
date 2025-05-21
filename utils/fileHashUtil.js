const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');

async function getFileHash(filePath) {
    const buffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function getFolderHashes(folderPath) {
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

module.exports = { getFolderHashes }