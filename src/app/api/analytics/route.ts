import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const organizationId = searchParams.get('organizationId') || '';
    const eventId = searchParams.get('eventId') || '';

    const eventWhere: any = {};
    if (organizationId) eventWhere.organizationId = organizationId;
    if (eventId) eventWhere.id = eventId;

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
      db.organization.count(),
      db.event.count({ where: eventWhere }),
      db.session.count({
        where: eventId ? { eventId } : {},
      }),
      db.queueEntry.count({
        where: eventId ? { eventId } : {},
      }),
      db.event.count({ where: { ...eventWhere, status: 'ACTIVE' } }),
      db.session.count({
        where: { status: 'COMPLETED', ...(eventId ? { eventId } : {}) },
      }),
      db.queueEntry.count({
        where: { status: 'WAITING', ...(eventId ? { eventId } : {}) },
      }),
      db.gallery.count({
        where: eventId ? { eventId } : {},
      }),
      db.device.count({
        where: eventId ? { eventId } : {},
      }),
    ]);

    const recentSessions = await db.session.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: eventId ? { eventId } : {},
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
