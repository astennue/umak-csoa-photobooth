import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext, canAccessOrg, isFacilitator } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const template = await db.template.findUnique({
      where: { id },
      include: { event: { select: { id: true, name: true, organizationId: true } } },
    });

    if (!template) {
      return errorResponse('Template not found', 404);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only view templates in their org
    if (!canAccessOrg(ctx, template.event.organizationId)) {
      return errorResponse('You can only view templates in your organization', 403);
    }

    return successResponse(template);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    // RBAC: FACILITATOR cannot edit templates
    if (isFacilitator(ctx)) {
      return errorResponse('Facilitators cannot edit templates', 403);
    }

    const { id } = await params;

    const existing = await db.template.findUnique({
      where: { id },
      include: { event: { select: { organizationId: true } } },
    });
    if (!existing) {
      return errorResponse('Template not found', 404);
    }

    // RBAC: ORG_ADMIN can only edit templates in their org
    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only edit templates in your organization', 403);
    }

    const body = await request.json();
    const {
      name, description,
      // New fields
      stripImageUrl, placeholders, layout,
      captureMode, captureDelay, includeGif, printAuto, emailAuto,
      // Legacy fields
      frameUrl, overlayUrl, settings,
      active,
    } = body;

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return errorResponse('Name must be a non-empty string', 400);
    }

    const template = await db.template.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        // New fields
        ...(stripImageUrl !== undefined && { stripImageUrl: stripImageUrl?.trim() || null }),
        ...(placeholders !== undefined && { placeholders: typeof placeholders === 'object' ? JSON.stringify(placeholders) : placeholders?.trim() || null }),
        ...(layout !== undefined && { layout: layout?.trim() || null }),
        ...(captureMode !== undefined && { captureMode }),
        ...(captureDelay !== undefined && { captureDelay: typeof captureDelay === 'number' ? captureDelay : 3 }),
        ...(includeGif !== undefined && { includeGif: typeof includeGif === 'boolean' ? includeGif : false }),
        ...(printAuto !== undefined && { printAuto: typeof printAuto === 'boolean' ? printAuto : false }),
        ...(emailAuto !== undefined && { emailAuto: typeof emailAuto === 'boolean' ? emailAuto : false }),
        // Legacy fields
        ...(frameUrl !== undefined && { frameUrl: frameUrl?.trim() || null }),
        ...(overlayUrl !== undefined && { overlayUrl: overlayUrl?.trim() || null }),
        ...(settings !== undefined && { settings: typeof settings === 'object' ? JSON.stringify(settings) : settings?.trim() || null }),
        ...(active !== undefined && { active }),
      },
      include: { event: { select: { id: true, name: true } } },
    });

    return successResponse(template);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    // RBAC: FACILITATOR cannot delete templates
    if (isFacilitator(ctx)) {
      return errorResponse('Facilitators cannot delete templates', 403);
    }

    const { id } = await params;

    const existing = await db.template.findUnique({
      where: { id },
      include: { event: { select: { organizationId: true } } },
    });
    if (!existing) {
      return errorResponse('Template not found', 404);
    }

    // RBAC: ORG_ADMIN can only delete templates in their org
    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only delete templates in your organization', 403);
    }

    await db.template.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
