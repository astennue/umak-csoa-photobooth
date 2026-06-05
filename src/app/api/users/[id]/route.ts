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
    const { name, email, role, organizationId, active, password } = body

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('User not found', 404)
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
    if (organizationId !== undefined) data.organizationId = organizationId || null
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

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('User not found', 404)
    }

    await db.user.delete({ where: { id } })

    return successResponse({ message: 'User deleted successfully' })
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}
