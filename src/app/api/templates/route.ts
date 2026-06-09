import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';
import { getAuthContext, canAccessOrg, isFacilitator, getOrgScope } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const eventId = searchParams.get('eventId') || '';

    const where: any = {};
    if (eventId) where.eventId = eventId;

    // RBAC: ORG_ADMIN and FACILITATOR can only see templates for their org's events
    const orgScope = getOrgScope(ctx);
    if (orgScope) {
      where.event = { organizationId: orgScope };
    }

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
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    // RBAC: FACILITATOR cannot create templates
    if (isFacilitator(ctx)) {
      return errorResponse('Facilitators cannot create templates', 403);
    }

    const body = await request.json();
    const {
      eventId, name, description,
      // New fields
      stripImageUrl, placeholders, layout,
      captureMode, captureDelay, includeGif, printAuto, emailAuto,
      // Legacy fields (backward compat)
      frameUrl, overlayUrl, settings,
      active,
    } = body;

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

    // RBAC: ORG_ADMIN can only create templates for their org's events
    if (!canAccessOrg(ctx, event.organizationId)) {
      return errorResponse('You can only create templates for events in your organization', 403);
    }

    const template = await db.template.create({
      data: {
        eventId,
        name: name.trim(),
        description: description?.trim() || null,
        // New fields
        stripImageUrl: stripImageUrl?.trim() || null,
        placeholders: typeof placeholders === 'object' ? JSON.stringify(placeholders) : placeholders?.trim() || null,
        layout: layout?.trim() || null,
        captureMode: captureMode || 'manual',
        captureDelay: typeof captureDelay === 'number' ? captureDelay : 3,
        includeGif: typeof includeGif === 'boolean' ? includeGif : false,
        printAuto: typeof printAuto === 'boolean' ? printAuto : false,
        emailAuto: typeof emailAuto === 'boolean' ? emailAuto : false,
        // Legacy fields
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
