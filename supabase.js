const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadAuthFolder(localAuthPath = './auth') {
    const files = fs.readdirSync(localAuthPath);

    for (const file of files) {
        const filePath = path.join(localAuthPath, file);
        const buffer = fs.readFileSync(filePath);
        const { error } = await supabase
            .storage
            .from(BUCKET_NAME)
            .upload(`auth/${file}`, buffer, {
                upsert: true,
                contentType: 'application/json'
            });

        if (error) {
            console.error('❌ Upload error:', error);
        } else {
            console.log(`✅ Uploaded ${file} to Supabase`);
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
        console.error('❌ Error listing Supabase files:', error);
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

}

module.exports = { uploadAuthFolder, downloadAuthFolder, supabase }