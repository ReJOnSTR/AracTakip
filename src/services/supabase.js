import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.kontrol-app.com'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_36cfd54f23bbf88d313317_24673797'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})

/**
 * Upload a file to Supabase Storage from the browser / client side
 * @param {File|Blob} file 
 * @param {string} path - path inside the bucket (e.g. 'company-1/vehicles/licence.pdf')
 * @param {string} bucket - bucket name (default: 'documents')
 * @returns {Promise<{path: string, url: string}|{error: any}>}
 */
export async function uploadFileToSupabase(file, path, bucket = 'documents') {
    try {
        const cleanPath = path.replace(/^\/+/, '')
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(cleanPath, file, {
                upsert: true,
                cacheControl: '3600'
            })

        if (error) throw error

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(cleanPath)

        return {
            success: true,
            path: data.path,
            url: publicUrlData.publicUrl
        }
    } catch (err) {
        console.error('[Supabase Storage Upload Error]:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Get Public or Signed URL for a file in Supabase Storage
 */
export function getSupabaseFileUrl(path, bucket = 'documents') {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path

    const cleanPath = path.replace(/^\/+/, '')
    const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath)
    return data.publicUrl || ''
}
