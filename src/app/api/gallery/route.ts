import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';
import { getAuthContext, canAccessOrg, getOrgScope } from '@/lib/auth';
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

/**
 * Upload a base64 dataUrl to Supabase Storage and return the public URL.
 * Falls back to returning the dataUrl directly if Supabase is not configured.
 */
async function uploadDataUrlToStorage(dataUrl: string): Promise<{ url: string; storage: 'supabase' | 'dataurl' }> {
  const parsed = parseDataUrl(dataUrl);
  const timestamp = Date.now();
  const uniqueId = randomUUID().slice(0, 8);
  const fileName = `${timestamp}-${uniqueId}.${parsed.extension}`;

  try {
    const { isSupabaseConfigured, uploadFile } = await import('@/lib/supabase-storage');
    if (await isSupabaseConfigured()) {
      const result = await uploadFile(parsed.buffer, fileName, 'gallery', parsed.mimeType);
      console.log('[Gallery API] Supabase upload successful:', result.url);
      return { url: result.url, storage: 'supabase' };
    }
  } catch (supabaseErr: any) {
    console.error('[Gallery API] Supabase upload failed:', supabaseErr?.message);
    throw new Error(
      `Upload to Supabase Storage failed: ${supabaseErr?.message || 'Unknown error'}. ` +
      'Please check your Supabase configuration in Settings > Storage.'
    );
  }

  // Supabase not configured — return the dataUrl as-is (not ideal for large images)
  console.warn('[Gallery API] Supabase Storage not configured — using dataUrl fallback');
  return { url: dataUrl, storage: 'dataurl' };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const eventId = searchParams.get('eventId') || '';
    const sessionId = searchParams.get('sessionId') || '';

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (sessionId) where.sessionId = sessionId;

    // RBAC: ORG_ADMIN and FACILITATOR can only see gallery for their org's events
    const orgScope = getOrgScope(ctx);
    if (orgScope) {
      where.event = { organizationId: orgScope };
    }

    const [items, total] = await Promise.all([
      db.gallery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { id: true, name: true } },
          gallerySession: { select: { id: true, guestName: true } },
        },
      }),
      db.gallery.count({ where }),
    ]);

    return successResponse(items, 200, { total, page, limit });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const {
      eventId,
      sessionId,
      photoUrl,
      photoDataUrl,
      thumbnailUrl,
      caption,
      isPublic,
      isFavorite,
    } = body as {
      eventId: string;
      sessionId?: string;
      photoUrl?: string;
      photoDataUrl?: string;
      thumbnailUrl?: string;
      caption?: string;
      isPublic?: boolean;
      isFavorite?: boolean;
    };

    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return errorResponse('Event ID is required', 400);
    }

    // Either photoUrl or photoDataUrl must be provided
    if (
      (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') &&
      (!photoDataUrl || typeof photoDataUrl !== 'string')
    ) {
      return errorResponse('Either photoUrl or photoDataUrl is required', 400);
    }

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return errorResponse('Event not found', 400);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only upload to their org's events
    if (!canAccessOrg(ctx, event.organizationId)) {
      return errorResponse('You can only upload photos for events in your organization', 403);
    }

    if (sessionId) {
      const session = await db.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        return errorResponse('Session not found', 400);
      }
    }

    // Determine the final photo URL
    let finalPhotoUrl: string;
    if (photoDataUrl && typeof photoDataUrl === 'string' && photoDataUrl.startsWith('data:')) {
      // Upload base64 dataUrl to Supabase Storage and use the public URL
      try {
        const uploadResult = await uploadDataUrlToStorage(photoDataUrl);
        finalPhotoUrl = uploadResult.url;
      } catch (uploadErr: any) {
        return errorResponse(uploadErr.message || 'Failed to upload photo from dataUrl', 400);
      }
    } else if (photoUrl && photoUrl.trim() !== '') {
      finalPhotoUrl = photoUrl.trim();
    } else {
      return errorResponse('Either photoUrl or photoDataUrl is required', 400);
    }

    const gallery = await db.gallery.create({
      data: {
        eventId,
        sessionId: sessionId?.trim() || null,
        photoUrl: finalPhotoUrl,
        thumbnailUrl: thumbnailUrl?.trim() || null,
        caption: caption?.trim() || null,
        isPublic: typeof isPublic === 'boolean' ? isPublic : true,
        isFavorite: typeof isFavorite === 'boolean' ? isFavorite : false,
      },
      include: {
        event: { select: { id: true, name: true } },
        gallerySession: { select: { id: true, guestName: true } },
      },
    });

    return successResponse(gallery, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
