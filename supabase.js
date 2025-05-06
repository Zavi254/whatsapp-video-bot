const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { getFolderHashes } = require('./fileHashUtil');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Stores the last known file hashes
let lastUploadedHashes = {}

// Logging helper
function log(message, level = 'info') {
    const now = new Date().toISOString();
    console.log(`[${now}] [${level.toUpperCase()}] ${message}`)
}

async function uploadAuthFolder(localAuthPath = './auth') {

    if (!fs.existsSync(localAuthPath)) {
        log(`Auth folder not found: ${localAuthPath}`, 'warn');
        return;
    }

    const files = fs.readdirSync(localAuthPath);
    const currentHashes = getFolderHashes(localAuthPath);

    for (const file of files) {
        const filePath = path.join(localAuthPath, file);

        const currentHash = currentHashes[file];
        const previousHash = lastUploadedHashes[file];

        if (currentHash === previousHash) {
            log(`⏩ Skipped unchanged file: ${file}`);
            continue;
        }

        const buffer = fs.readFileSync(filePath);
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
            lastUploadedHashes[file] = currentHash;
        }
    }

}

async function downloadAuthFolder(localAuthPath = './auth') {
    if (!fs.existsSync(localAuthPath)) fs.mkdirSync(localAuthPath, { recursive: true });

    const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .list('auth');

    if (error) {
        log(`❌ Error listing Supabase files: ${error.message}`, 'error');
        return;
    }

    for (const file of data) {
        const { data: fileData, error: downloadError } = await supabase
            .storage
            .from(BUCKET_NAME)
            .download(`auth/${file.name}`);

        if (downloadError) {
            console.error(`❌ Error downloading ${file.name}:`, downloadError);
            continue;
        }

        const filePath = path.join(localAuthPath, file.name);
        fs.writeFileSync(filePath, Buffer.from(await fileData.arrayBuffer()));
        console.log(`⬇️ Downloaded ${file.name} from Supabase`)
    }

    // Refresh hash cache after download
    lastUploadedHashes = getFolderHashes(localAuthPath);

}

module.exports = { uploadAuthFolder, downloadAuthFolder, supabase }