import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getAuthContext } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { email, password, name, role, organizationId } = body

    // Validate required fields
    if (!email || !password || !name || !role) {
      return errorResponse('Email, password, name, and role are required')
    }

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'ORG_ADMIN', 'FACILITATOR']
    if (!validRoles.includes(role)) {
      return errorResponse('Invalid role. Must be SUPER_ADMIN, ORG_ADMIN, or FACILITATOR')
    }

    // RBAC: FACILITATOR cannot create any accounts
    if (ctx.role === 'FACILITATOR') {
      return errorResponse('Facilitators cannot create user accounts', 403)
    }

    // RBAC: ORG_ADMIN can only create FACILITATOR accounts
    if (ctx.role === 'ORG_ADMIN' && role !== 'FACILITATOR') {
      return errorResponse('Organization Admins can only create Facilitator accounts', 403)
    }

    // RBAC: ORG_ADMIN must assign to their own org
    let effectiveOrgId = organizationId
    if (ctx.role === 'ORG_ADMIN' && ctx.organizationId) {
      effectiveOrgId = ctx.organizationId
    }

    // RBAC: ORG_ADMIN cannot create SUPER_ADMIN
    if (ctx.role === 'ORG_ADMIN' && role === 'SUPER_ADMIN') {
      return errorResponse('Organization Admins cannot create Super Admin accounts', 403)
    }

    // Check email uniqueness
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return errorResponse('Email already exists')
    }

    // Hash password and encrypt plain password
    const hashedPassword = await bcrypt.hash(password, 12)
    const encryptedPassword = encrypt(password)

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        plainPassword: encryptedPassword,
        name,
        role,
        organizationId: effectiveOrgId || null,
      },
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

    return successResponse(user, 201)
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create user', 500)
  }
}
