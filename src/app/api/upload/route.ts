import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getAuthContext, isFacilitator } from '@/lib/auth'
import { uploadFile, isSupabaseConfigured } from '@/lib/supabase-storage'
import { randomUUID } from 'crypto'
import { extname } from 'path'

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const EXT_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
}

/**
 * POST /api/upload
 *
 * Upload a file (image). Strategy:
 * 1. If Supabase Storage is configured → upload there, return public URL
 * 2. If Supabase is NOT configured → convert to dataUrl and return it
 *    (dataUrl works as an img src and can be stored in the database)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const ctx = await getAuthContext()
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401)
    }

    // FACILITATOR cannot upload template files
    if (isFacilitator(ctx)) {
      return errorResponse('Facilitators cannot upload files', 403)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'templates'

    if (!file) {
      return errorResponse('No file provided', 400)
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return errorResponse(
        `Unsupported file type: ${file.type}. Allowed: PNG, JPEG, WebP, GIF, SVG`,
        400
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('File too large. Maximum size is 10 MB.', 400)
    }

    // Generate unique filename
    const ext = EXT_MAP[file.type] || extname(file.name) || '.png'
    const uniqueName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`

    // Try Supabase first
    const supabaseReady = await isSupabaseConfigured()

    if (supabaseReady) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await uploadFile(buffer, uniqueName, folder, file.type)
        console.log('[Upload API] Supabase upload successful:', result.url)
        return successResponse(
          {
            url: result.url,
            supabaseUrl: result.url,
            filename: uniqueName,
            folder,
            size: file.size,
            mimeType: file.type,
            storage: 'supabase',
          },
          201
        )
      } catch (err: any) {
        console.warn('[Upload API] Supabase upload failed, falling back to dataUrl:', err.message)
        // Fall through to dataUrl fallback
      }
    }

    // Fallback: convert to dataUrl
    // This works without any external storage and can be used as an img src
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    console.warn('[Upload API] Using dataUrl fallback (Supabase not configured or upload failed)')
    return successResponse(
      {
        url: dataUrl,
        dataUrl,
        filename: uniqueName,
        folder,
        size: file.size,
        mimeType: file.type,
        storage: 'dataurl',
        warning:
          'Supabase Storage is not configured. Image stored as base64 dataUrl. ' +
          'Configure Supabase Storage for persistent file uploads.',
      },
      201
    )
  } catch (err: any) {
    console.error('[Upload API] Error:', err)
    return errorResponse(err.message || 'Upload failed', 500)
  }
}
