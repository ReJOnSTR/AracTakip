const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase.kontrol-app.com'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_36cfd54f23bbf88d313317_24673797'

// Initialize Supabase Admin client with service role key (or anon key fallback)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

/**
 * Upload a Buffer to a Supabase Storage Bucket
 * @param {Buffer} buffer - File buffer
 * @param {string} storagePath - Destination path inside bucket (e.g. 'company_1/doc_123.pdf')
 * @param {string} mimeType - e.g. 'application/pdf', 'image/jpeg'
 * @param {string} bucket - default: 'documents'
 * @returns {Promise<{success: boolean, path?: string, publicUrl?: string, error?: string}>}
 */
async function uploadToStorage(buffer, storagePath, mimeType = 'application/octet-stream', bucket = 'documents') {
    try {
        const cleanPath = storagePath.replace(/^\/+/, '')
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(cleanPath, buffer, {
                contentType: mimeType,
                upsert: true
            })

        if (error) throw error

        const { data: publicUrlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(cleanPath)

        return {
            success: true,
            path: data.path,
            publicUrl: publicUrlData.publicUrl
        }
    } catch (err) {
        console.error('[Supabase Admin Storage Upload Error]:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Download a file buffer from a Supabase Storage Bucket
 */
async function downloadFromStorage(storagePath, bucket = 'documents') {
    try {
        const cleanPath = storagePath.replace(/^\/+/, '')
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .download(cleanPath)

        if (error) throw error

        const arrayBuffer = await data.arrayBuffer()
        return { success: true, buffer: Buffer.from(arrayBuffer) }
    } catch (err) {
        console.error('[Supabase Storage Download Error]:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Delete a file from Supabase Storage
 */
async function deleteFromStorage(storagePath, bucket = 'documents') {
    try {
        const cleanPath = storagePath.replace(/^\/+/, '')
        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .remove([cleanPath])

        if (error) throw error
        return { success: true }
    } catch (err) {
        console.error('[Supabase Storage Delete Error]:', err.message)
        return { success: false, error: err.message }
    }
}

/**
 * Get Public URL for a file
 */
function getStoragePublicUrl(storagePath, bucket = 'documents') {
    if (!storagePath) return ''
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath
    const cleanPath = storagePath.replace(/^\/+/, '')
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(cleanPath)
    return data.publicUrl || ''
}

module.exports = {
    supabaseAdmin,
    SUPABASE_URL,
    uploadToStorage,
    downloadFromStorage,
    deleteFromStorage,
    getStoragePublicUrl
}
