import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext, canAccessOrg } from '@/lib/auth';

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
    const item = await db.gallery.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true, organizationId: true } },
        gallerySession: { select: { id: true, guestName: true } },
      },
    });

    if (!item) {
      return errorResponse('Gallery item not found', 404);
    }

    if (!canAccessOrg(ctx, item.event.organizationId)) {
      return errorResponse('You can only view photos in your organization', 403);
    }

    return successResponse(item);
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
    const existing = await db.gallery.findUnique({
      where: { id },
      include: { event: { select: { organizationId: true } } },
    });

    if (!existing) {
      return errorResponse('Gallery item not found', 404);
    }

    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only edit photos in your organization', 403);
    }

    const body = await request.json();
    const { caption, isPublic, isFavorite } = body;

    const item = await db.gallery.update({
      where: { id },
      data: {
        ...(caption !== undefined && { caption: caption?.trim() || null }),
        ...(isPublic !== undefined && { isPublic }),
        ...(isFavorite !== undefined && { isFavorite }),
      },
      include: {
        event: { select: { id: true, name: true } },
        gallerySession: { select: { id: true, guestName: true } },
      },
    });

    return successResponse(item);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const existing = await db.gallery.findUnique({
      where: { id },
      include: { event: { select: { organizationId: true } } },
    });

    if (!existing) {
      return errorResponse('Gallery item not found', 404);
    }

    if (!canAccessOrg(ctx, existing.event.organizationId)) {
      return errorResponse('You can only delete photos in your organization', 403);
    }

    await db.gallery.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
