import { supabase } from "./supabase.js"
import qrcode from "qrcode"
import { randomUUID } from "crypto";

export async function uploadQRToSupabase(qrData) {
    try {
        // Generate image buffer from QR string
        const qrImageBuffer = await qrcode.toBuffer(qrData);

        // Generate unique file name
        const fileName = `qr-codes/qr-${randomUUID()}.png`;
        // Upload to Supabase
        const { error } = await supabase
            .storage
            .from(process.env.SUPABASE_BUCKET)
            .upload(fileName, qrImageBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) {
            console.error('❌ Upload error:', error);
            return null;
        }

        // Get public URL
        const { data: publicUrlData } = supabase
            .storage
            .from(process.env.SUPABASE_BUCKET)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;

    } catch (error) {
        console.error('❌ QR Upload Failed:', error);
        return null;
    }
}