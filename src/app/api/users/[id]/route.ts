import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: { id: true, name: true },
        },
      },
    })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    return successResponse(user)
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, role, organizationId, active, password, userRole, userOrgId } = body

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('User not found', 404)
    }

    // RBAC: ORG_ADMIN can only edit FACILITATOR accounts in their own org
    if (userRole === 'ORG_ADMIN' && userOrgId) {
      if (existing.role !== 'FACILITATOR') {
        return errorResponse('You can only edit Facilitator accounts', 403)
      }
      if (existing.organizationId !== userOrgId) {
        return errorResponse('You can only edit users in your organization', 403)
      }
      // Cannot change role away from FACILITATOR
      if (role && role !== 'FACILITATOR') {
        return errorResponse('You can only assign Facilitator role', 403)
      }
    }

    // RBAC: FACILITATOR cannot edit any accounts
    if (userRole === 'FACILITATOR') {
      return errorResponse('Facilitators cannot edit user accounts', 403)
    }

    // Check email uniqueness if email is being changed
    if (email && email !== existing.email) {
      const emailTaken = await db.user.findUnique({ where: { email } })
      if (emailTaken) {
        return errorResponse('Email already in use')
      }
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (role !== undefined) data.role = role
    if (organizationId !== undefined) {
      // ORG_ADMIN must keep users in their own org
      if (userRole === 'ORG_ADMIN' && userOrgId) {
        data.organizationId = userOrgId
      } else {
        data.organizationId = organizationId || null
      }
    }
    if (active !== undefined) data.active = active
    if (password) {
      data.password = await bcrypt.hash(password, 12)
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return successResponse(user)
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // RBAC: Check via query params
    const searchParams = new URL(request.url).searchParams
    const userRole = searchParams.get('userRole') || ''
    const userOrgId = searchParams.get('userOrgId') || ''

    // FACILITATOR cannot delete users
    if (userRole === 'FACILITATOR') {
      return errorResponse('Facilitators cannot delete user accounts', 403)
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('User not found', 404)
    }

    // ORG_ADMIN can only delete FACILITATOR accounts in their own org
    if (userRole === 'ORG_ADMIN' && userOrgId) {
      if (existing.role !== 'FACILITATOR') {
        return errorResponse('You can only delete Facilitator accounts', 403)
      }
      if (existing.organizationId !== userOrgId) {
        return errorResponse('You can only delete users in your organization', 403)
      }
    }

    await db.user.delete({ where: { id } })

    return successResponse({ message: 'User deleted successfully' })
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}
