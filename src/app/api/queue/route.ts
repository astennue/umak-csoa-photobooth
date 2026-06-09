import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';
import { getAuthContext, canAccessOrg, getOrgScope } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const eventId = searchParams.get('eventId') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;

    // RBAC: ORG_ADMIN and FACILITATOR can only see queue for their org's events
    const orgScope = getOrgScope(ctx);
    if (orgScope) {
      where.event = { organizationId: orgScope };
    }

    const [items, total] = await Promise.all([
      db.queueEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { position: 'asc' },
        include: {
          event: { select: { id: true, name: true } },
          queueSession: { select: { id: true, guestName: true } },
        },
      }),
      db.queueEntry.count({ where }),
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
    const { eventId, sessionId, name, email, phone } = body;

    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return errorResponse('Event ID is required', 400);
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return errorResponse('Name is required', 400);
    }

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return errorResponse('Event not found', 400);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only add to queue for their org's events
    if (!canAccessOrg(ctx, event.organizationId)) {
      return errorResponse('You can only add to queue for events in your organization', 403);
    }

    // Auto-assign next position
    const maxPosition = await db.queueEntry.findFirst({
      where: { eventId, status: { in: ['WAITING', 'NOTIFIED', 'ACTIVE'] } },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = (maxPosition?.position || 0) + 1;

    const entry = await db.queueEntry.create({
      data: {
        eventId,
        sessionId: sessionId?.trim() || null,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        position,
        status: 'WAITING',
      },
      include: {
        event: { select: { id: true, name: true } },
        queueSession: { select: { id: true, guestName: true } },
      },
    });

    return successResponse(entry, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
