import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext, canAccessOrg } from '@/lib/auth';

const VALID_STATUSES = ['WAITING', 'NOTIFIED', 'ACTIVE', 'COMPLETED', 'SKIPPED', 'CANCELLED'];
const STATUS_TRANSITIONS: Record<string, string[]> = {
  WAITING: ['NOTIFIED', 'SKIPPED', 'CANCELLED'],
  NOTIFIED: ['ACTIVE', 'SKIPPED', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'SKIPPED', 'CANCELLED'],
  COMPLETED: [],
  SKIPPED: [],
  CANCELLED: [],
};

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
    const entry = await db.queueEntry.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true, organizationId: true } },
        queueSession: { select: { id: true, guestName: true } },
      },
    });

    if (!entry) {
      return errorResponse('Queue entry not found', 404);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only view queue entries in their org
    if (!canAccessOrg(ctx, entry.event.organizationId)) {
      return errorResponse('You can only view queue entries in your organization', 403);
    }

    return successResponse(entry);
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

    const { id } = await params;

    const existing = await db.queueEntry.findUnique({
      where: { id },
      include: { event: { select: { organizationId: true } } },
    });
    if (!existing) {
      return errorResponse('Queue entry not found', 404);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only edit queue entries in their org
    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only edit queue entries in your organization', 403);
    }

    const body = await request.json();
    const { position, status, name, email, phone } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const updateData: any = {};
    if (position !== undefined) {
      if (typeof position !== 'number' || position < 1) {
        return errorResponse('Position must be a positive number', 400);
      }
      updateData.position = position;
    }
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (status) {
      if (!STATUS_TRANSITIONS[existing.status]?.includes(status)) {
        return errorResponse(`Cannot transition from ${existing.status} to ${status}. Allowed: ${STATUS_TRANSITIONS[existing.status]?.join(', ') || 'none'}`, 400);
      }
      updateData.status = status;
      if (status === 'NOTIFIED') updateData.notifiedAt = new Date();
      if (status === 'ACTIVE') updateData.activatedAt = new Date();
      if (status === 'COMPLETED') updateData.completedAt = new Date();
    }

    const entry = await db.queueEntry.update({
      where: { id },
      data: updateData,
      include: {
        event: { select: { id: true, name: true } },
        queueSession: { select: { id: true, guestName: true } },
      },
    });

    return successResponse(entry);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return errorResponse('Status is required for PATCH', 400);
    }

    const existing = await db.queueEntry.findUnique({
      where: { id },
      include: { event: { select: { organizationId: true } } },
    });
    if (!existing) {
      return errorResponse('Queue entry not found', 404);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only update queue entries in their org
    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only update queue entries in your organization', 403);
    }

    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }
    if (!STATUS_TRANSITIONS[existing.status]?.includes(status)) {
      return errorResponse(`Cannot transition from ${existing.status} to ${status}. Allowed: ${STATUS_TRANSITIONS[existing.status]?.join(', ') || 'none'}`, 400);
    }

    const updateData: any = { status };
    if (status === 'NOTIFIED') updateData.notifiedAt = new Date();
    if (status === 'ACTIVE') updateData.activatedAt = new Date();
    if (status === 'COMPLETED') updateData.completedAt = new Date();

    const entry = await db.queueEntry.update({
      where: { id },
      data: updateData,
      include: {
        event: { select: { id: true, name: true } },
        queueSession: { select: { id: true, guestName: true } },
      },
    });

    return successResponse(entry);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
