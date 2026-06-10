import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext } from '@/lib/auth';
import { randomUUID } from 'crypto';

/**
 * Convert a base64 dataUrl to a Buffer and extract metadata.
 */
function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } {
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid dataUrl format. Expected data:image/...;base64,...');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  const extension = mimeToExt[mimeType] || 'png';

  return { buffer, mimeType, extension };
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { photoDataUrl, templateName, copies, sessionId } = body as {
      photoDataUrl: string;
      templateName?: string;
      copies?: number;
      sessionId?: string;
    };

    // Validate required fields
    if (!photoDataUrl || typeof photoDataUrl !== 'string') {
      return errorResponse('Photo data is required', 400);
    }

    // Parse the dataUrl
    let photoBuffer: Buffer;
    let photoExtension: string;
    let photoMimeType: string;
    try {
      const parsed = parseDataUrl(photoDataUrl);
      photoBuffer = parsed.buffer;
      photoExtension = parsed.extension;
      photoMimeType = parsed.mimeType;
    } catch (parseErr: any) {
      return errorResponse(parseErr.message || 'Invalid photo data format', 400);
    }

    // Upload the photo to Supabase Storage (no local filesystem writes)
    const printJobId = randomUUID();
    const timestamp = Date.now();
    const fileName = `${timestamp}-${printJobId.slice(0, 8)}.${photoExtension}`;
    let photoUrl: string;

    try {
      const { isSupabaseConfigured, uploadFile } = await import('@/lib/supabase-storage');
      if (await isSupabaseConfigured()) {
        const result = await uploadFile(photoBuffer, fileName, 'gallery', photoMimeType);
        photoUrl = result.url;
        console.log('[Print API] Photo uploaded to Supabase:', photoUrl);
      } else {
        // Supabase not configured — use dataUrl as fallback
        console.warn('[Print API] Supabase Storage not configured — using dataUrl fallback');
        photoUrl = photoDataUrl;
      }
    } catch (supabaseErr: any) {
      console.error('[Print API] Supabase upload failed:', supabaseErr?.message);
      // Fall back to dataUrl so print still works
      photoUrl = photoDataUrl;
    }

    const numCopies = typeof copies === 'number' && copies > 0 ? copies : 1;

    // Log the print job — store as audit log
    try {
      await db.auditLog.create({
        data: {
          action: 'PRINT_JOB_CREATED',
          entityType: 'Photo',
          details: JSON.stringify({
            printJobId,
            photoUrl,
            templateName: templateName || null,
            copies: numCopies,
            sessionId: sessionId || null,
          }),
          performedBy: ctx.userId,
          sessionId: sessionId?.trim() || null,
        },
      });
    } catch {
      // Audit log failure should not block the print response
    }

    return successResponse({
      success: true,
      printJobId,
      photoUrl,
      dataUrl: photoDataUrl,
      copies: numCopies,
      templateName: templateName || null,
      note: 'Photo saved. Use window.print() on the frontend with the returned dataUrl to print.',
    }, 200);
  } catch (err: any) {
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
