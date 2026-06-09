import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAuthContext, canAccessOrg } from '@/lib/auth'
import { encrypt, decrypt } from '@/lib/crypto'

// Helper to determine if a user can see the password of another user
function canSeePassword(ctx: { role: string | null; userId: string | null; organizationId: string | null }, targetUser: { id: string; role: string; organizationId: string | null }): boolean {
  if (!ctx.role || !ctx.userId) return false
  // SUPER_ADMIN can see ALL passwords
  if (ctx.role === 'SUPER_ADMIN') return true
  // ORG_ADMIN can see passwords of users in their org (but NOT SuperAdmin passwords) + their own
  if (ctx.role === 'ORG_ADMIN' && ctx.organizationId) {
    if (targetUser.role === 'SUPER_ADMIN') return false
    return targetUser.organizationId === ctx.organizationId || targetUser.id === ctx.userId
  }
  // FACILITATOR cannot see any passwords
  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext()
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401)
    }

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
        plainPassword: true,
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

    // RBAC: ORG_ADMIN and FACILITATOR can only view users in their own org
    if (!canAccessOrg(ctx, user.organizationId)) {
      return errorResponse('You can only view users in your organization', 403)
    }

    // Add visible password
    const visiblePassword = canSeePassword(ctx, user) && user.plainPassword
      ? decrypt(user.plainPassword)
      : null

    const { plainPassword, ...userWithoutPlainPassword } = user
    return successResponse({ ...userWithoutPlainPassword, visiblePassword })
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext()
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, role, organizationId, active, password } = body

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('User not found', 404)
    }

    // RBAC: ORG_ADMIN can only edit FACILITATOR accounts in their own org
    if (ctx.role === 'ORG_ADMIN' && ctx.organizationId) {
      if (existing.role !== 'FACILITATOR') {
        return errorResponse('You can only edit Facilitator accounts', 403)
      }
      if (existing.organizationId !== ctx.organizationId) {
        return errorResponse('You can only edit users in your organization', 403)
      }
      // Cannot change role away from FACILITATOR
      if (role && role !== 'FACILITATOR') {
        return errorResponse('You can only assign Facilitator role', 403)
      }
    }

    // RBAC: FACILITATOR cannot edit any accounts
    if (ctx.role === 'FACILITATOR') {
      return errorResponse('Facilitators cannot edit user accounts', 403)
    }

    // SUPER_ADMIN changing role to ORG_ADMIN must specify organization
    if (ctx.role === 'SUPER_ADMIN' && role === 'ORG_ADMIN' && !organizationId) {
      return errorResponse('Organization is required for Org Admin role')
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
      if (ctx.role === 'ORG_ADMIN' && ctx.organizationId) {
        data.organizationId = ctx.organizationId
      } else {
        data.organizationId = organizationId || null
      }
    }
    if (active !== undefined) data.active = active
    if (password) {
      data.password = await bcrypt.hash(password, 12)
      data.plainPassword = encrypt(password)
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
    const ctx = await getAuthContext()
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401)
    }

    const { id } = await params

    // FACILITATOR cannot delete users
    if (ctx.role === 'FACILITATOR') {
      return errorResponse('Facilitators cannot delete user accounts', 403)
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('User not found', 404)
    }

    // ORG_ADMIN can only delete FACILITATOR accounts in their own org
    if (ctx.role === 'ORG_ADMIN' && ctx.organizationId) {
      if (existing.role !== 'FACILITATOR') {
        return errorResponse('You can only delete Facilitator accounts', 403)
      }
      if (existing.organizationId !== ctx.organizationId) {
        return errorResponse('You can only delete users in your organization', 403)
      }
    }

    await db.user.delete({ where: { id } })

    return successResponse({ message: 'User deleted successfully' })
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}
