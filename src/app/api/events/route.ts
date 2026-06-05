import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const organizationId = searchParams.get('organizationId') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      db.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { sessions: true, queueEntries: true, templates: true, gallery: true, devices: true } },
        },
      }),
      db.event.count({ where }),
    ]);

    return successResponse(items, 200, { total, page, limit });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, organizationId, location, startDate, endDate, status, maxSessions } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return errorResponse('Name is required and must be a non-empty string', 400);
    }
    if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
      return errorResponse('Organization ID is required', 400);
    }
    if (!startDate) {
      return errorResponse('Start date is required', 400);
    }

    const validStatuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return errorResponse('Organization not found', 400);
    }

    const event = await db.event.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId,
        location: location?.trim() || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'DRAFT',
        maxSessions: typeof maxSessions === 'number' && maxSessions > 0 ? maxSessions : 100,
      },
      include: { organization: { select: { id: true, name: true } } },
    });

    return successResponse(event, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
