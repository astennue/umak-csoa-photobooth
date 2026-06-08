import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const searchParams = new URL(request.url).searchParams;
    const organizationId = searchParams.get('organizationId') || '';
    const eventId = searchParams.get('eventId') || '';

    // RBAC: ORG_ADMIN and FACILITATOR can only see analytics for their own org
    const effectiveOrgId = (ctx.role === 'ORG_ADMIN' || ctx.role === 'FACILITATOR')
      ? ctx.organizationId
      : organizationId;

    const eventWhere: any = {};
    if (effectiveOrgId) eventWhere.organizationId = effectiveOrgId;
    if (eventId) eventWhere.id = eventId;

    const sessionEventWhere: any = {};
    if (effectiveOrgId) sessionEventWhere.organizationId = effectiveOrgId;

    const [
      totalOrganizations,
      totalEvents,
      totalSessions,
      totalQueueEntries,
      activeEvents,
      completedSessions,
      waitingInQueue,
      activeQueueEntries,
      completedQueueEntries,
      totalGallery,
      totalDevices,
    ] = await Promise.all([
      (ctx.role === 'ORG_ADMIN' || ctx.role === 'FACILITATOR')
        ? db.organization.count({ where: { id: effectiveOrgId || 'none' } })
        : db.organization.count(),
      db.event.count({ where: eventWhere }),
      db.session.count({
        where: effectiveOrgId
          ? { event: { organizationId: effectiveOrgId }, ...(eventId ? { eventId } : {}) }
          : eventId ? { eventId } : {},
      }),
      db.queueEntry.count({
        where: effectiveOrgId
          ? { event: { organizationId: effectiveOrgId }, ...(eventId ? { eventId } : {}) }
          : eventId ? { eventId } : {},
      }),
      db.event.count({ where: { ...eventWhere, status: 'ACTIVE' } }),
      db.session.count({
        where: {
          status: 'COMPLETED',
          ...(effectiveOrgId ? { event: { organizationId: effectiveOrgId } } : {}),
          ...(eventId ? { eventId } : {}),
        },
      }),
      db.queueEntry.count({
        where: {
          status: 'WAITING',
          ...(effectiveOrgId ? { event: { organizationId: effectiveOrgId } } : {}),
          ...(eventId ? { eventId } : {}),
        },
      }),
      db.queueEntry.count({
        where: {
          status: 'ACTIVE',
          ...(effectiveOrgId ? { event: { organizationId: effectiveOrgId } } : {}),
          ...(eventId ? { eventId } : {}),
        },
      }),
      db.queueEntry.count({
        where: {
          status: 'COMPLETED',
          ...(effectiveOrgId ? { event: { organizationId: effectiveOrgId } } : {}),
          ...(eventId ? { eventId } : {}),
        },
      }),
      db.gallery.count({
        where: effectiveOrgId
          ? { event: { organizationId: effectiveOrgId }, ...(eventId ? { eventId } : {}) }
          : eventId ? { eventId } : {},
      }),
      db.device.count({
        where: effectiveOrgId
          ? { event: { organizationId: effectiveOrgId }, ...(eventId ? { eventId } : {}) }
          : eventId ? { eventId } : {},
      }),
    ]);

    const recentSessions = await db.session.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: effectiveOrgId
        ? { event: { organizationId: effectiveOrgId }, ...(eventId ? { eventId } : {}) }
        : eventId ? { eventId } : {},
      include: { event: { select: { id: true, name: true } } },
    });

    return successResponse({
      totalOrganizations,
      totalEvents,
      totalSessions,
      totalQueueEntries,
      activeEvents,
      completedSessions,
      waitingInQueue,
      activeQueueEntries,
      completedQueueEntries,
      totalGallery,
      totalDevices,
      recentSessions,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
