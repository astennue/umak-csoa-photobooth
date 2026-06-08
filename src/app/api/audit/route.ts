import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';
import { getAuthContext, isSuperAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const organizationId = searchParams.get('organizationId') || '';
    const eventId = searchParams.get('eventId') || '';
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entityType') || '';

    const where: any = {};

    // RBAC: ORG_ADMIN and FACILITATOR can only see audit logs for their own org
    if (!isSuperAdmin(ctx) && ctx.organizationId) {
      where.organizationId = ctx.organizationId;
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
