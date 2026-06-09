/**
 * Supabase Storage utility for file uploads.
 *
 * Usage:
 * - When NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set,
 *   files are uploaded to Supabase Storage (production).
 * - When they are NOT set, files are saved to the local filesystem
 *   under public/uploads/ (local development).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const STORAGE_BUCKET = 'uploads'

let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null
  if (supabaseInstance) return supabaseInstance

  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  return supabaseInstance
}

/**
 * Check if Supabase Storage is configured and available
 */
export function isSupabaseStorageAvailable(): boolean {
  return !!getSupabaseClient()
}

/**
 * Ensure the uploads bucket exists in Supabase Storage
 */
async function ensureBucket(): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false

  try {
    const { data: buckets } = await client.storage.listBuckets()
    const exists = buckets?.some((b) => b.id === STORAGE_BUCKET)

    if (!exists) {
      const { error } = await client.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/gif',
        ],
      })
      if (error) {
        console.error('[Supabase Storage] Error creating bucket:', error.message)
        return false
      }
    }
    return true
  } catch (err) {
    console.error('[Supabase Storage] Error ensuring bucket:', err)
    return false
  }
}

export interface UploadResult {
  url: string
  storage: 'supabase' | 'local'
}

/**
 * Upload a file buffer to storage (Supabase or local).
 *
 * @param buffer - File data
 * @param filename - Unique filename (e.g. "template-1234567890-abc123.png")
 * @param folder - Sub-folder inside storage (e.g. "templates")
 * @param contentType - MIME type
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  folder: string,
  contentType: string
): Promise<UploadResult> {
  // Try Supabase Storage first
  const client = getSupabaseClient()
  if (client) {
    try {
      await ensureBucket()

      const storagePath = `${folder}/${filename}`
      const { error: uploadError } = await client.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        console.error('[Supabase Storage] Upload error:', uploadError.message)
        // Fall through to local storage
      } else {
        // Get the public URL
        const { data: urlData } = client.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath)

        if (urlData?.publicUrl) {
          console.log('[Supabase Storage] Upload successful:', storagePath)
          return {
            url: urlData.publicUrl,
            storage: 'supabase',
          }
        }
      }
    } catch (err) {
      console.error('[Supabase Storage] Exception:', err)
      // Fall through to local storage
    }
  }

  // Fallback: Save to local filesystem under public/uploads/
  const fs = await import('fs/promises')
  const path = await import('path')
  const { existsSync } = await import('fs')

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
  if (!existsSync(uploadDir)) {
    await fs.mkdir(uploadDir, { recursive: true })
  }

  const filePath = path.join(uploadDir, filename)
  await fs.writeFile(filePath, buffer)

  return {
    url: `/uploads/${folder}/${filename}`,
    storage: 'local',
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  folder: string,
  filename: string,
  storage: 'supabase' | 'local'
): Promise<boolean> {
  if (storage === 'supabase') {
    const client = getSupabaseClient()
    if (client) {
      try {
        const { error } = await client.storage
          .from(STORAGE_BUCKET)
          .remove([`${folder}/${filename}`])
        return !error
      } catch {
        return false
      }
    }
  }

  // Local: delete file from public/uploads/
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const filePath = path.join(process.cwd(), 'public', 'uploads', folder, filename)
    await fs.unlink(filePath)
    return true
  } catch {
    return false
  }
}
