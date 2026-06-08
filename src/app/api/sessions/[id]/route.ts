import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext, canAccessOrg } from '@/lib/auth';

const VALID_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
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
    const session = await db.session.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true, organizationId: true } },
        _count: { select: { queueEntries: true, gallery: true } },
      },
    });

    if (!session) {
      return errorResponse('Session not found', 404);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only view sessions in their org
    if (!canAccessOrg(ctx, session.event.organizationId)) {
      return errorResponse('You can only view sessions in your organization', 403);
    }

    return successResponse(session);
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

    const existing = await db.session.findUnique({ where: { id }, include: { event: { select: { organizationId: true } } } });
    if (!existing) {
      return errorResponse('Session not found', 404);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only edit sessions in their org
    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only edit sessions in your organization', 403);
    }

    const body = await request.json();

    const { guestName, guestEmail, guestPhone, status, notes } = body;

    if (guestName !== undefined && (typeof guestName !== 'string' || guestName.trim() === '')) {
      return errorResponse('Guest name must be a non-empty string', 400);
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }
    if (status && !STATUS_TRANSITIONS[existing.status]?.includes(status)) {
      return errorResponse(`Cannot transition from ${existing.status} to ${status}. Allowed: ${STATUS_TRANSITIONS[existing.status]?.join(', ') || 'none'}`, 400);
    }

    const updateData: any = {};
    if (guestName !== undefined) updateData.guestName = guestName.trim();
    if (guestEmail !== undefined) updateData.guestEmail = guestEmail?.trim() || null;
    if (guestPhone !== undefined) updateData.guestPhone = guestPhone?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (status) {
      updateData.status = status;
      if (status === 'IN_PROGRESS' && !existing.startedAt) updateData.startedAt = new Date();
      if (status === 'COMPLETED') {
        if (!existing.startedAt) updateData.startedAt = new Date();
        updateData.completedAt = new Date();
      }
    }

    const session = await db.session.update({
      where: { id },
      data: updateData,
      include: { event: { select: { id: true, name: true } } },
    });

    return successResponse(session);
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

    const existing = await db.session.findUnique({ where: { id }, include: { event: { select: { organizationId: true } } } });
    if (!existing) {
      return errorResponse('Session not found', 404);
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only update sessions in their org
    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only update sessions in your organization', 403);
    }

    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }
    if (!STATUS_TRANSITIONS[existing.status]?.includes(status)) {
      return errorResponse(`Cannot transition from ${existing.status} to ${status}. Allowed: ${STATUS_TRANSITIONS[existing.status]?.join(', ') || 'none'}`, 400);
    }

    const updateData: any = { status };
    if (status === 'IN_PROGRESS' && !existing.startedAt) updateData.startedAt = new Date();
    if (status === 'COMPLETED') {
      if (!existing.startedAt) updateData.startedAt = new Date();
      updateData.completedAt = new Date();
    }

    const session = await db.session.update({
      where: { id },
      data: updateData,
      include: { event: { select: { id: true, name: true } } },
    });

    return successResponse(session);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
