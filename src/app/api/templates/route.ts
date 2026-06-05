import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const eventId = searchParams.get('eventId') || '';

    const where: any = {};
    if (eventId) where.eventId = eventId;

    const [items, total] = await Promise.all([
      db.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { event: { select: { id: true, name: true } } },
      }),
      db.template.count({ where }),
    ]);

    return successResponse(items, 200, { total, page, limit });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, name, description, frameUrl, overlayUrl, settings, active } = body;

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

    const template = await db.template.create({
      data: {
        eventId,
        name: name.trim(),
        description: description?.trim() || null,
        frameUrl: frameUrl?.trim() || null,
        overlayUrl: overlayUrl?.trim() || null,
        settings: typeof settings === 'object' ? JSON.stringify(settings) : settings?.trim() || null,
        active: typeof active === 'boolean' ? active : true,
      },
      include: { event: { select: { id: true, name: true } } },
    });

    return successResponse(template, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
