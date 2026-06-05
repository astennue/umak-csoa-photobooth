import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

const VALID_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await db.event.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { sessions: true, queueEntries: true, templates: true, gallery: true, devices: true } },
      },
    });

    if (!event) {
      return errorResponse('Event not found', 404);
    }

    return successResponse(event);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.event.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Event not found', 404);
    }

    const { name, description, location, startDate, endDate, status, maxSessions } = body;

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return errorResponse('Name must be a non-empty string', 400);
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(`Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }
    if (status && !STATUS_TRANSITIONS[existing.status]?.includes(status)) {
      return errorResponse(`Cannot transition from ${existing.status} to ${status}. Allowed: ${STATUS_TRANSITIONS[existing.status]?.join(', ') || 'none'}`, 400);
    }

    const event = await db.event.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status }),
        ...(maxSessions !== undefined && { maxSessions }),
      },
      include: { organization: { select: { id: true, name: true } } },
    });

    return successResponse(event);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
