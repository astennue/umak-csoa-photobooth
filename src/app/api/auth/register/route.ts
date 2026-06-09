import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getAuthContext, isSuperAdmin, isOrgAdmin, isFacilitator } from '@/lib/auth'
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
    if (isFacilitator(ctx)) {
      return errorResponse('Facilitators cannot create user accounts', 403)
    }

    // RBAC: ORG_ADMIN can only create FACILITATOR accounts in their own org
    if (isOrgAdmin(ctx)) {
      if (role !== 'FACILITATOR') {
        return errorResponse('Organization Admins can only create Facilitator accounts', 403)
      }
      if (role === 'SUPER_ADMIN') {
        return errorResponse('Organization Admins cannot create Super Admin accounts', 403)
      }
    }

    // Determine the effective organizationId
    let effectiveOrgId = organizationId
    if (isOrgAdmin(ctx) && ctx.organizationId) {
      // ORG_ADMIN must assign to their own org (ignore any provided orgId)
      effectiveOrgId = ctx.organizationId
    }

    // SUPER_ADMIN creating ORG_ADMIN must specify organization
    if (isSuperAdmin(ctx) && role === 'ORG_ADMIN' && !organizationId) {
      return errorResponse('Organization is required when creating an Org Admin account')
    }

    // SUPER_ADMIN creating FACILITATOR must specify organization
    if (isSuperAdmin(ctx) && role === 'FACILITATOR' && !organizationId) {
      return errorResponse('Organization is required when creating a Facilitator account')
    }

    // Verify the organization exists when specified
    if (effectiveOrgId) {
      const org = await db.organization.findUnique({ where: { id: effectiveOrgId } })
      if (!org) {
        return errorResponse('Organization not found')
      }
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
