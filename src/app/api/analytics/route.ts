import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext, getOrgScope } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const searchParams = new URL(request.url).searchParams;
    const queryOrgId = searchParams.get('organizationId') || '';
    const queryEventId = searchParams.get('eventId') || '';

    // RBAC: ORG_ADMIN and FACILITATOR can only see analytics for their own org
    // SUPER_ADMIN can optionally filter by orgId or see everything
    const orgScope = getOrgScope(ctx);
    const effectiveOrgId = orgScope ?? (queryOrgId || undefined);

    const eventWhere: any = {};
    if (effectiveOrgId) eventWhere.organizationId = effectiveOrgId;
    if (queryEventId) eventWhere.id = queryEventId;

    const sessionWhere: any = {};
    if (effectiveOrgId) sessionWhere.event = { organizationId: effectiveOrgId };
    if (queryEventId) sessionWhere.eventId = queryEventId;

    const queueWhere: any = {};
    if (effectiveOrgId) queueWhere.event = { organizationId: effectiveOrgId };
    if (queryEventId) queueWhere.eventId = queryEventId;

    const galleryWhere: any = {};
    if (effectiveOrgId) galleryWhere.event = { organizationId: effectiveOrgId };
    if (queryEventId) galleryWhere.eventId = queryEventId;

    const deviceWhere: any = {};
    if (effectiveOrgId) deviceWhere.event = { organizationId: effectiveOrgId };
    if (queryEventId) deviceWhere.eventId = queryEventId;

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
      // ORG_ADMIN/FACILITATOR see count 1 (their org), SUPER_ADMIN sees all
      orgScope
        ? db.organization.count({ where: { id: orgScope } })
        : db.organization.count(),
      db.event.count({ where: eventWhere }),
      db.session.count({ where: sessionWhere }),
      db.queueEntry.count({ where: queueWhere }),
      db.event.count({ where: { ...eventWhere, status: 'ACTIVE' } }),
      db.session.count({ where: { ...sessionWhere, status: 'COMPLETED' } }),
      db.queueEntry.count({ where: { ...queueWhere, status: 'WAITING' } }),
      db.queueEntry.count({ where: { ...queueWhere, status: 'ACTIVE' } }),
      db.queueEntry.count({ where: { ...queueWhere, status: 'COMPLETED' } }),
      db.gallery.count({ where: galleryWhere }),
      db.device.count({ where: deviceWhere }),
    ]);

    const recentSessions = await db.session.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: sessionWhere,
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
