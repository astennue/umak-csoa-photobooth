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

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'uploads', folder);
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Write file to local filesystem
    const filePath = join(uploadDir, uniqueName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    writeFileSync(filePath, buffer);

    // Build the URL for accessing the file
    // Use the generic /api/files/ route which serves from uploads/ directory
    const fileUrl = `/api/files/${folder}/${uniqueName}`;

    // Optionally also upload to Supabase if configured
    let supabaseUrl: string | null = null;
    try {
      const { isSupabaseConfigured, uploadFile } = await import('@/lib/supabase-storage');
      if (await isSupabaseConfigured()) {
        const result = await uploadFile(buffer, uniqueName, folder, file.type);
        supabaseUrl = result.url;
      }
    } catch (supabaseErr: any) {
      // Supabase upload failed — local file is still available
      console.warn('[Upload API] Supabase upload skipped/failed:', supabaseErr?.message);
    }

    return successResponse(
      {
        url: supabaseUrl || fileUrl,
        localUrl: fileUrl,
        supabaseUrl,
        filename: uniqueName,
        folder,
        size: file.size,
        mimeType: file.type,
      },
      201
    );
  } catch (err: any) {
    console.error('[Upload API] Error:', err);
    return errorResponse(err.message || 'Upload failed', 500);
  }
}
