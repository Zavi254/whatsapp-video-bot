const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { getFolderHashes } = require('../utils/fileHashUtil');

const {
    loadHashes,
    saveHashes,
    getChangedFiles,
    updateStoredHashes
} = require('../fileHashCache');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const AUTH_FOLDER = './auth';
const HASH_FILE = path.join(__dirname, 'fileHashes.json')

// Logging helper
function log(message, level = 'info') {
    const now = new Date().toISOString();
    console.log(`[${now}] [${level.toUpperCase()}] ${message}`)
}

async function uploadAuthFolder(localAuthPath = AUTH_FOLDER) {
    try {
        const { changedFiles, currentHashes } = await getChangedFiles(localAuthPath, HASH_FILE);

        if (changedFiles.length === 0) {
            log('🟢 No auth files changed. Skipping upload');
            return;
        }

        for (const file of changedFiles) {
            const filePath = path.join(localAuthPath, file);
            const buffer = await fs.readFile(filePath);

            const { error } = await supabase
                .storage
                .from(BUCKET_NAME)
                .upload(`auth/${file}`, buffer, {
                    upsert: true,
                    contentType: 'application/json'
                });

            if (error) {
                log(`❌ Upload error for ${file}: ${error.message}`, 'error')
            } else {
                log(`✅ Uploaded ${file} to Supabase`);
            }
        }

        // save updated hashes after successful uploads
        await updateStoredHashes(currentHashes, HASH_FILE);

    } catch (error) {
        log(`❌ Error uploading auth folder: ${error.message}`, 'error')
    }
}

async function downloadAuthFolder(localAuthPath = AUTH_FOLDER) {
    try {
        await fs.mkdir(localAuthPath, { recursive: true });

        const { data, error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .list('auth');

        if (error) {
            log(`❌ Error listing Supabase files: ${error.message}`, 'error');
            return;
        }

        const previousHashes = await loadHashes(HASH_FILE);
        const downloadedHashes = {};

        for (const file of data) {
            const filePath = path.join(localAuthPath, file.name);

            const { data: fileData, error: downloadError } = await supabase
                .storage
                .from(BUCKET_NAME)
                .download(`auth/${file.name}`)

            if (downloadError) {
                log(`❌ Error downloading ${file.name}: ${downloadError.message}`, 'error');
                continue;
            }

            const buffer = Buffer.from(await fileData.arrayBuffer());
            const currentHash = require('crypto').createHash('sha256').update(buffer).digest('hex');

            if (previousHashes[file.name] === currentHash) {
                log(`⏩ Skipped download (unchanged): ${file.name}`);
                downloadedHashes[file.name] = currentHash;
                continue;
            }

            await fs.writeFile(filePath, buffer);
            log(`⬇️ Downloaded ${file.name} from Supabase`);
            downloadedHashes[file.name] = currentHash
        }

        await updateStoredHashes(downloadedHashes, HASH_FILE);

    } catch (err) {
        log(`❌ Error downloading auth folder: ${err.message}`, 'error');

    }
}

module.exports = { uploadAuthFolder, downloadAuthFolder, supabase }