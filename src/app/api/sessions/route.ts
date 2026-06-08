import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';
import { getAuthContext, applyEventOrgFilter, canAccessOrg } from '@/lib/auth';

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

    // RBAC: ORG_ADMIN and FACILITATOR can only see sessions for their org's events
    applyEventOrgFilter(where, ctx.role || '', ctx.organizationId || '');

    const [items, total] = await Promise.all([
      db.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { id: true, name: true, organizationId: true } },
          _count: { select: { queueEntries: true, gallery: true } },
        },
      }),
      db.session.count({ where }),
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
    const { eventId, guestName, guestEmail, guestPhone, status, notes } = body;

    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return errorResponse('Event ID is required', 400);
    }
    if (!guestName || typeof guestName !== 'string' || guestName.trim() === '') {
      return errorResponse('Guest name is required', 400);
    }

    const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return errorResponse('Event not found', 400);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only create sessions for their org's events
    if (!canAccessOrg(ctx, event.organizationId)) {
      return errorResponse('You can only create sessions for events in your organization', 403);
    }

    const session = await db.session.create({
      data: {
        eventId,
        guestName: guestName.trim(),
        guestEmail: guestEmail?.trim() || null,
        guestPhone: guestPhone?.trim() || null,
        status: status || 'SCHEDULED',
        notes: notes?.trim() || null,
        ...(status === 'IN_PROGRESS' && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && { startedAt: new Date(), completedAt: new Date() }),
      },
      include: { event: { select: { id: true, name: true } } },
    });

    return successResponse(session, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
