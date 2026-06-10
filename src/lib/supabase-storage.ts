/**
 * Supabase Storage utility for file uploads.
 *
 * Credentials are loaded from:
 * 1. Environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * 2. Database (SupabaseConfig table with keys "supabase_url" and "service_role_key")
 *
 * NO local filesystem fallback — Supabase is required for file storage.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const STORAGE_BUCKET = 'uploads'

// ── Supabase Client Singleton ──────────────────────────────────────────

let supabaseInstance: SupabaseClient | null = null
let lastCredsHash: string | null = null

/**
 * Get Supabase credentials from env vars or database.
 */
async function getSupabaseCredentials(): Promise<{ url: string; key: string } | null> {
  // 1. Try environment variables first (fastest, no DB query)
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (envUrl && envKey) {
    return { url: envUrl, key: envKey }
  }

  // 2. Try database (SupabaseConfig table)
  try {
    const { db } = await import('@/lib/db')
    const configs = await db.supabaseConfig.findMany()
    const urlConfig = configs.find(c => c.key === 'supabase_url')
    const keyConfig = configs.find(c => c.key === 'service_role_key')
    if (urlConfig?.value && keyConfig?.value) {
      return { url: urlConfig.value, key: keyConfig.value }
    }
  } catch (e) {
    console.warn('[Supabase Storage] Could not read config from DB:', e)
  }

  return null
}

/**
 * Get or create the Supabase client.
 * Re-creates the client if credentials have changed.
 */
async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const creds = await getSupabaseCredentials()
  if (!creds) return null

  // Re-create client if credentials changed (e.g., user updated settings)
  const credsHash = `${creds.url}:${creds.key.substring(0, 10)}`
  if (supabaseInstance && lastCredsHash === credsHash) {
    return supabaseInstance
  }

  supabaseInstance = createClient(creds.url, creds.key, {
    auth: { persistSession: false },
  })
  lastCredsHash = credsHash
  return supabaseInstance
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Synchronous check — only checks env vars (for backwards compat).
 * Use isSupabaseConfigured() for async check that also checks DB.
 */
export function isSupabaseStorageAvailable(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Async check — checks both env vars and database.
 */
export async function isSupabaseConfigured(): Promise<boolean> {
  return !!(await getSupabaseCredentials())
}

/**
 * Reset the Supabase client singleton (call after saving new credentials).
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null
  lastCredsHash = null
}

export interface UploadResult {
  url: string
  storage: 'supabase' | 'local'
}

/**
 * Upload a file buffer to Supabase Storage.
 *
 * @param buffer - File data
 * @param filename - Unique filename
 * @param folder - Sub-folder inside storage (e.g. "templates")
 * @param contentType - MIME type
 * @throws Error if Supabase is not configured
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  folder: string,
  contentType: string
): Promise<UploadResult> {
  const client = await getSupabaseClient()

  if (!client) {
    throw new Error(
      'Supabase Storage is not configured. Please add your Supabase Service Role Key in Settings > Storage.'
    )
  }

  const storagePath = `${folder}/${filename}`
  const { error: uploadError } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Upload to Supabase failed: ${uploadError.message}`)
  }

  const { data: urlData } = client.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath)

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded file')
  }

  console.log('[Supabase Storage] Upload successful:', storagePath)
  return {
    url: urlData.publicUrl,
    storage: 'supabase',
  }
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(
  folder: string,
  filename: string
): Promise<boolean> {
  const client = await getSupabaseClient()
  if (!client) return false

  try {
    const { error } = await client.storage
      .from(STORAGE_BUCKET)
      .remove([`${folder}/${filename}`])
    return !error
  } catch {
    return false
  }
}

/**
 * Test the Supabase connection by listing buckets.
 * Returns true if connection works.
 */
export async function testConnection(): Promise<{ success: boolean; buckets?: string[]; error?: string }> {
  const client = await getSupabaseClient()
  if (!client) {
    return { success: false, error: 'Supabase credentials not configured' }
  }

  try {
    const { data, error } = await client.storage.listBuckets()
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, buckets: data?.map(b => b.id) ?? [] }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
