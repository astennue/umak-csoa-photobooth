import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext } from '@/lib/auth';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
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
    try {
      const parsed = parseDataUrl(photoDataUrl);
      photoBuffer = parsed.buffer;
      photoExtension = parsed.extension;
    } catch (parseErr: any) {
      return errorResponse(parseErr.message || 'Invalid photo data format', 400);
    }

    // Save the photo to public/gallery for print reference
    const printJobId = randomUUID();
    const timestamp = Date.now();
    const fileName = `${timestamp}-${printJobId.slice(0, 8)}.${photoExtension}`;
    const galleryDir = join(process.cwd(), 'public', 'gallery');

    // Ensure directory exists
    if (!existsSync(galleryDir)) {
      mkdirSync(galleryDir, { recursive: true });
    }

    const filePath = join(galleryDir, fileName);
    writeFileSync(filePath, photoBuffer);

    const photoUrl = `/gallery/${fileName}`;
    const numCopies = typeof copies === 'number' && copies > 0 ? copies : 1;

    // Log the print job — we can use a simple AuditLog entry or just return
    // Since there's no dedicated PrintJob model, store as audit log
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
