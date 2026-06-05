import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';
import { applyEventOrgFilter } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const eventId = searchParams.get('eventId') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const userRole = searchParams.get('userRole') || '';
    const userOrgId = searchParams.get('userOrgId') || '';

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    if (type) where.type = type;

    // RBAC: ORG_ADMIN and FACILITATOR can only see devices for their org's events
    applyEventOrgFilter(where, userRole, userOrgId);

    const [items, total] = await Promise.all([
      db.device.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { event: { select: { id: true, name: true } } },
      }),
      db.device.count({ where }),
    ]);

    return successResponse(items, 200, { total, page, limit });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, name, type, status, ipAddress, firmware, userRole, userOrgId } = body;

    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return errorResponse('Event ID is required', 400);
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return errorResponse('Device name is required', 400);
    }

    const validTypes = ['PHOTOBOOTH', 'PRINTER', 'KIOSK'];
    if (type && !validTypes.includes(type)) {
      return errorResponse(`Type must be one of: ${validTypes.join(', ')}`, 400);
    }

    const validStatuses = ['ONLINE', 'OFFLINE', 'BUSY', 'ERROR'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return errorResponse('Event not found', 400);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only register devices for their org's events
    if ((userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR') && userOrgId) {
      if (event.organizationId !== userOrgId) {
        return errorResponse('You can only register devices for events in your organization', 403);
      }
    }

    const device = await db.device.create({
      data: {
        eventId,
        name: name.trim(),
        type: type || 'PHOTOBOOTH',
        status: status || 'OFFLINE',
        ipAddress: ipAddress?.trim() || null,
        firmware: firmware?.trim() || null,
      },
      include: { event: { select: { id: true, name: true } } },
    });

    return successResponse(device, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
