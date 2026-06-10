import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext, isFacilitator } from '@/lib/auth';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

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
 * Try writing to the local filesystem.
 * On Vercel/serverless, the filesystem is read-only except /tmp.
 * Returns the local URL path if successful, null otherwise.
 */
function tryLocalWrite(buffer: Buffer, folder: string, uniqueName: string): string | null {
  // Try the project uploads/ directory first (local dev)
  const projectUploadDir = join(process.cwd(), 'uploads', folder);
  try {
    if (!existsSync(projectUploadDir)) {
      mkdirSync(projectUploadDir, { recursive: true });
    }
    const filePath = join(projectUploadDir, uniqueName);
    writeFileSync(filePath, buffer);
    console.log('[Upload API] Local write successful (project dir):', filePath);
    return `/api/files/${folder}/${uniqueName}`;
  } catch (err: any) {
    if (err?.code !== 'EROFS') {
      // Not a read-only error, something else went wrong
      console.warn('[Upload API] Local write failed (non-EROFS):', err?.message);
      return null;
    }
  }

  // Fallback: try /tmp (works on Vercel/serverless)
  const tmpUploadDir = join('/tmp', 'photobooth-uploads', folder);
  try {
    if (!existsSync(tmpUploadDir)) {
      mkdirSync(tmpUploadDir, { recursive: true });
    }
    const filePath = join(tmpUploadDir, uniqueName);
    writeFileSync(filePath, buffer);
    console.log('[Upload API] Local write successful (/tmp):', filePath);
    // Note: /tmp files are ephemeral and not served by /api/files/
    // They can only be used temporarily — Supabase is the real solution
    return `/api/tmp-files/${folder}/${uniqueName}`;
  } catch (err: any) {
    console.warn('[Upload API] /tmp write also failed:', err?.message);
    return null;
  }
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

    // ── Strategy: Try Supabase Storage first (works on all environments) ──
    let supabaseUrl: string | null = null;
    try {
      const { isSupabaseConfigured, uploadFile } = await import('@/lib/supabase-storage');
      if (await isSupabaseConfigured()) {
        const result = await uploadFile(buffer, uniqueName, folder, file.type);
        supabaseUrl = result.url;
        console.log('[Upload API] Supabase upload successful:', supabaseUrl);
      }
    } catch (supabaseErr: any) {
      console.warn('[Upload API] Supabase upload failed:', supabaseErr?.message);
    }

    // If Supabase succeeded, use that URL (works everywhere including Vercel)
    if (supabaseUrl) {
      return successResponse(
        {
          url: supabaseUrl,
          supabaseUrl,
          filename: uniqueName,
          folder,
          size: file.size,
          mimeType: file.type,
          storage: 'supabase',
        },
        201
      );
    }

    // ── Fallback: Try local filesystem (works in local dev, not on Vercel) ──
    const localUrl = tryLocalWrite(buffer, folder, uniqueName);

    if (localUrl) {
      return successResponse(
        {
          url: localUrl,
          localUrl,
          filename: uniqueName,
          folder,
          size: file.size,
          mimeType: file.type,
          storage: 'local',
        },
        201
      );
    }

    // ── All storage methods failed ──
    return errorResponse(
      'Could not save file. The server filesystem is read-only and Supabase Storage is not configured. ' +
      'Please configure Supabase Storage in Settings to enable file uploads.',
      507
    );
  } catch (err: any) {
    console.error('[Upload API] Error:', err);
    return errorResponse(err.message || 'Upload failed', 500);
  }
}
