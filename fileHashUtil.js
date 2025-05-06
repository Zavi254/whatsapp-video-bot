const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function getFileHash(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function getFolderHashes(folderPath) {
    const files = fs.readdirSync(folderPath);
    const hashes = {};

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        if (fs.statSync(filePath).isFile()) {
            hashes[file] = getFileHash(filePath);
        }
    }

    return hashes;
}

module.exports = { getFolderHashes }