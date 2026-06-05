import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const organizationId = searchParams.get('organizationId') || '';
    const eventId = searchParams.get('eventId') || '';
    const userRole = searchParams.get('userRole') || '';
    const userOrgId = searchParams.get('userOrgId') || '';

    // RBAC: ORG_ADMIN and FACILITATOR can only see analytics for their own org
    const effectiveOrgId = (userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR') ? userOrgId : organizationId;

    const eventWhere: any = {};
    if (effectiveOrgId) eventWhere.organizationId = effectiveOrgId;
    if (eventId) eventWhere.id = eventId;

    // Session and queue filters that respect org scope
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
      totalGallery,
      totalDevices,
    ] = await Promise.all([
      // SUPER_ADMIN sees all orgs, others only see their own
      (userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR')
        ? db.organization.count({ where: { id: effectiveOrgId } })
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
      totalGallery,
      totalDevices,
      recentSessions,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
