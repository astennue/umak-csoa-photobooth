import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const organizationId = searchParams.get('organizationId') || '';
    const eventId = searchParams.get('eventId') || '';
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entityType') || '';
    const userRole = searchParams.get('userRole') || '';
    const userOrgId = searchParams.get('userOrgId') || '';

    const where: any = {};

    // RBAC: ORG_ADMIN and FACILITATOR can only see audit logs for their own org
    if ((userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR') && userOrgId) {
      where.organizationId = userOrgId;
    } else if (organizationId) {
      where.organizationId = organizationId;
    }

    if (eventId) where.eventId = eventId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.auditLog.count({ where }),
    ]);

    return successResponse(items, 200, { total, page, limit });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
