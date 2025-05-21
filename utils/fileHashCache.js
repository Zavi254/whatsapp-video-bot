const fs = require('fs').promises;
const path = require('path');
const { getFolderHashes } = require('./fileHashUtil');

const DEFAULT_HASH_FILE = path.join(__dirname, 'fileHashes.json');

async function loadHashes(hashFile = DEFAULT_HASH_FILE) {
    try {
        const content = await fs.readFile(hashFile, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        return {};
    }
}

async function saveHashes(hashes, hashFile = DEFAULT_HASH_FILE) {
    await fs.writeFile(hashFile, JSON.stringify(hashes, null, 2));
}

async function getChangedFiles(folderPath, hashFile = DEFAULT_HASH_FILE) {
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

async function updateStoredHashes(newHashes, hashFile = DEFAULT_HASH_FILE) {
    await saveHashes(newHashes, hashFile);
}

module.exports = {
    loadHashes,
    saveHashes,
    getChangedFiles,
    updateStoredHashes,
};