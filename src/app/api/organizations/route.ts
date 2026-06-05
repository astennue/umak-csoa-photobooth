import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { page, limit, skip } = paginateRequest(request);
    const searchParams = getSearchParams(request);
    const search = searchParams.get('search') || '';
    const userRole = searchParams.get('userRole') || '';
    const userOrgId = searchParams.get('userOrgId') || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only see their own organization
    if ((userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR') && userOrgId) {
      where.id = userOrgId;
    }

    const [items, total] = await Promise.all([
      db.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { events: true } } },
      }),
      db.organization.count({ where }),
    ]);

    return successResponse(items, 200, { total, page, limit });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, logoUrl, email, phone, active, userRole } = body;

    // RBAC: Only SUPER_ADMIN can create organizations
    if (userRole && userRole !== 'SUPER_ADMIN') {
      return errorResponse('Only Super Admins can create organizations', 403);
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return errorResponse('Name is required and must be a non-empty string', 400);
    }

    const org = await db.organization.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        active: typeof active === 'boolean' ? active : true,
      },
    });

    return successResponse(org, 201);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return errorResponse('A record with this unique field already exists', 409);
    }
    return errorResponse(err.message, 500);
  }
}
