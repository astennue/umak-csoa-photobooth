import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext, canAccessOrg, isFacilitator } from '@/lib/auth';

const VALID_TYPES = ['PHOTOBOOTH', 'PRINTER', 'KIOSK'];
const VALID_STATUSES = ['ONLINE', 'OFFLINE', 'BUSY', 'ERROR'];

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
    const device = await db.device.findUnique({
      where: { id },
      include: { event: { select: { id: true, name: true, organizationId: true } } },
    });

    if (!device) {
      return errorResponse('Device not found', 404);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only view devices in their org
    if (!canAccessOrg(ctx, device.event.organizationId)) {
      return errorResponse('You can only view devices in your organization', 403);
    }

    return successResponse(device);
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

    // RBAC: FACILITATOR cannot edit devices
    if (isFacilitator(ctx)) {
      return errorResponse('Facilitators cannot edit devices', 403);
    }

    const { id } = await params;

    const existing = await db.device.findUnique({
      where: { id },
      include: { event: { select: { organizationId: true } } },
    });
    if (!existing) {
      return errorResponse('Device not found', 404);
    }

    // RBAC: ORG_ADMIN can only edit devices in their org
    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only edit devices in your organization', 403);
    }

    const body = await request.json();
    const { name, type, status, ipAddress, firmware, eventId } = body;

    // If changing event, verify access to new event
    if (eventId && eventId !== existing.eventId) {
      const newEvent = await db.event.findUnique({ where: { id: eventId } });
      if (!newEvent) {
        return errorResponse('Event not found', 400);
      }
      if (!canAccessOrg(ctx, newEvent.organizationId)) {
        return errorResponse('You can only assign devices to events in your organization', 403);
      }
    }

    if (type && !VALID_TYPES.includes(type)) {
      return errorResponse(`Type must be one of: ${VALID_TYPES.join(', ')}`, 400);
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress?.trim() || null;
    if (firmware !== undefined) updateData.firmware = firmware?.trim() || null;
    if (eventId !== undefined) updateData.eventId = eventId;

    const device = await db.device.update({
      where: { id },
      data: updateData,
      include: { event: { select: { id: true, name: true } } },
    });

    return successResponse(device);
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

    // RBAC: FACILITATOR cannot delete devices
    if (isFacilitator(ctx)) {
      return errorResponse('Facilitators cannot delete devices', 403);
    }

    const { id } = await params;

    const existing = await db.device.findUnique({
      where: { id },
      include: { event: { select: { organizationId: true } } },
    });
    if (!existing) {
      return errorResponse('Device not found', 404);
    }

    // RBAC: ORG_ADMIN can only delete devices in their org
    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only delete devices in your organization', 403);
    }

    await db.device.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
