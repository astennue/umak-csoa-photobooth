import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';
import { applyEventOrgFilter } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const eventId = searchParams.get('eventId') || '';
    const sessionId = searchParams.get('sessionId') || '';
    const userRole = searchParams.get('userRole') || '';
    const userOrgId = searchParams.get('userOrgId') || '';

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (sessionId) where.sessionId = sessionId;

    // RBAC: ORG_ADMIN and FACILITATOR can only see gallery for their org's events
    applyEventOrgFilter(where, userRole, userOrgId);

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
    const body = await request.json();
    const { eventId, sessionId, photoUrl, thumbnailUrl, caption, isPublic, isFavorite, userRole, userOrgId } = body;

    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return errorResponse('Event ID is required', 400);
    }
    if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
      return errorResponse('Photo URL is required', 400);
    }

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return errorResponse('Event not found', 400);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only upload to their org's events
    if ((userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR') && userOrgId) {
      if (event.organizationId !== userOrgId) {
        return errorResponse('You can only upload photos for events in your organization', 403);
      }
    }

    if (sessionId) {
      const session = await db.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        return errorResponse('Session not found', 400);
      }
    }

    const gallery = await db.gallery.create({
      data: {
        eventId,
        sessionId: sessionId?.trim() || null,
        photoUrl: photoUrl.trim(),
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
