import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
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

    // Check email uniqueness
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return errorResponse('Email already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        organizationId: organizationId || null,
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
