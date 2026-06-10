import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext, isFacilitator } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const EXT_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

/**
 * Generate a base64 data URL from a buffer and MIME type.
 * Used as a fallback so template creation can embed the image directly
 * even when file serving is ephemeral or unavailable.
 */
function toDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    // FACILITATOR cannot upload template files
    if (isFacilitator(ctx)) {
      return errorResponse('Facilitators cannot upload files', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'templates';

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return errorResponse(
        `Unsupported file type: ${file.type}. Allowed: PNG, JPEG, WebP, GIF, SVG`,
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('File too large. Maximum size is 10 MB.', 400);
    }

    // Generate unique filename
    const ext = EXT_MAP[file.type] || extname(file.name) || '.png';
    const uniqueName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate base64 data URL as a universal fallback.
    // This ensures the template creation flow always has image data available.
    const dataUrl = toDataUrl(buffer, file.type);

    // ── Upload to Supabase Storage (PRIMARY and ONLY method) ──
    // No local filesystem writes — Vercel/serverless has read-only filesystem
    try {
      const { isSupabaseConfigured, uploadFile } = await import('@/lib/supabase-storage');
      if (await isSupabaseConfigured()) {
        const result = await uploadFile(buffer, uniqueName, folder, file.type);
        console.log('[Upload API] Supabase upload successful:', result.url);
        return successResponse(
          {
            url: result.url,
            supabaseUrl: result.url,
            dataUrl,
            filename: uniqueName,
            folder,
            size: file.size,
            mimeType: file.type,
            storage: 'supabase',
          },
          201
        );
      }
    } catch (supabaseErr: any) {
      console.error('[Upload API] Supabase upload failed:', supabaseErr?.message);
      // If Supabase is configured but failed, return the error — don't fall through to non-existent local storage
      return errorResponse(
        `Upload to Supabase Storage failed: ${supabaseErr?.message || 'Unknown error'}. ` +
        'Please check your Supabase configuration in Settings > Storage.',
        502
      );
    }

    // ── Supabase is NOT configured ──
    // Return dataUrl-only response with a warning so the client can still use the image
    // (embedded as base64 in the template), but warn that persistent storage is not available
    console.warn('[Upload API] Supabase Storage not configured — returning dataUrl-only response');
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
          'Supabase Storage is not configured. The image was converted to a base64 data URL, ' +
          'which works but is not ideal for large images. To enable persistent file uploads, ' +
          'please configure Supabase Storage in Settings > Storage.',
      },
      201
    );
  } catch (err: any) {
    console.error('[Upload API] Error:', err);
    return errorResponse(err.message || 'Upload failed', 500);
  }
}
