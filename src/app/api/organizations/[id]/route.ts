import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const org = await db.organization.findUnique({
      where: { id },
      include: { _count: { select: { events: true, auditLogs: true } } },
    });

    if (!org) {
      return errorResponse('Organization not found', 404);
    }

    return successResponse(org);
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

    const existing = await db.organization.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Organization not found', 404);
    }

    const { name, description, logoUrl, email, phone, active } = body;
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return errorResponse('Name must be a non-empty string', 400);
    }

    const org = await db.organization.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(active !== undefined && { active }),
      },
    });

    return successResponse(org);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return errorResponse('A record with this unique field already exists', 409);
    }
    return errorResponse(err.message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.organization.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Organization not found', 404);
    }

    await db.organization.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
