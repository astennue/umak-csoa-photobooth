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
 * Generate a base64 data URL from a buffer and MIME type.
 * Used as a fallback so template creation can embed the image directly
 * even when file serving is ephemeral (/tmp) or unavailable.
 */
function toDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Try writing to the local project uploads/ directory.
 * Only works in local development (read-only on Vercel/serverless).
 * Returns the local URL path if successful, null otherwise.
 */
function tryProjectDirWrite(buffer: Buffer, folder: string, uniqueName: string): string | null {
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
    // EROFS = read-only filesystem (expected on Vercel)
    // ENOSPC = no space left
    // Any error means we just skip this method
    console.log('[Upload API] Project dir write skipped:', err?.code || err?.message);
    return null;
  }
}

/**
 * Try writing to /tmp/photobooth-uploads/.
 * Works on Vercel/serverless (writable /tmp), but files are ephemeral.
 * Returns the tmp-files URL path if successful, null otherwise.
 */
function tryTmpDirWrite(buffer: Buffer, folder: string, uniqueName: string): string | null {
  const tmpUploadDir = join('/tmp', 'photobooth-uploads', folder);
  try {
    if (!existsSync(tmpUploadDir)) {
      mkdirSync(tmpUploadDir, { recursive: true });
    }
    const filePath = join(tmpUploadDir, uniqueName);
    writeFileSync(filePath, buffer);
    console.log('[Upload API] /tmp write successful:', filePath);
    return `/api/tmp-files/${folder}/${uniqueName}`;
  } catch (err: any) {
    console.warn('[Upload API] /tmp write failed:', err?.message);
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

    // Generate base64 data URL as a universal fallback.
    // This ensures the template creation flow always has image data available,
    // even if file serving from /tmp is ephemeral or Supabase is not configured.
    const dataUrl = toDataUrl(buffer, file.type);

    // ── Strategy 1: Try Supabase Storage (works on ALL environments) ──
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

    // ── Strategy 2: Try local project uploads/ dir (local dev only) ──
    const projectUrl = tryProjectDirWrite(buffer, folder, uniqueName);
    if (projectUrl) {
      return successResponse(
        {
          url: projectUrl,
          localUrl: projectUrl,
          dataUrl,
          filename: uniqueName,
          folder,
          size: file.size,
          mimeType: file.type,
          storage: 'local',
        },
        201
      );
    }

    // ── Strategy 3: Try /tmp directory (works on Vercel, ephemeral) ──
    const tmpUrl = tryTmpDirWrite(buffer, folder, uniqueName);
    if (tmpUrl) {
      return successResponse(
        {
          url: tmpUrl,
          tmpUrl,
          dataUrl,
          filename: uniqueName,
          folder,
          size: file.size,
          mimeType: file.type,
          storage: 'tmp',
          warning:
            'File stored in /tmp and will be lost on server restart. ' +
            'Configure Supabase Storage in Settings for persistent file uploads.',
        },
        201
      );
    }

    // ── All storage methods failed ──
    // Still return the dataUrl so the client can potentially use it
    return errorResponse(
      'Could not save file to any storage. The server filesystem is read-only and Supabase Storage is not configured. ' +
      'To enable persistent file uploads, please configure Supabase Storage:\n' +
      '1. Go to Settings > Storage\n' +
      '2. Enter your Supabase URL and Service Role Key\n' +
      '3. Create an "uploads" bucket in your Supabase project',
      507
    );
  } catch (err: any) {
    console.error('[Upload API] Error:', err);
    return errorResponse(err.message || 'Upload failed', 500);
  }
}
