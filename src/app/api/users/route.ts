import { db } from '@/lib/db'
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils'
import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { decrypt } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401)
    }

    const { limit, skip } = paginateRequest(request)
    const searchParams = getSearchParams(request)
    const search = searchParams.get('search') || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    // RBAC: ORG_ADMIN can only see users in their own org
    if (ctx.role === 'ORG_ADMIN' && ctx.organizationId) {
      where.organizationId = ctx.organizationId
    }
    // FACILITATOR can only see users in their own org
    if (ctx.role === 'FACILITATOR' && ctx.organizationId) {
      where.organizationId = ctx.organizationId
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ])

    // Add visible passwords based on RBAC
    const usersWithPasswords = users.map((user) => {
      let visiblePassword: string | null = null

      if (ctx.role === 'SUPER_ADMIN') {
        // SUPER_ADMIN can see ALL passwords
        visiblePassword = user.plainPassword ? decrypt(user.plainPassword) : null
      } else if (ctx.role === 'ORG_ADMIN' && ctx.organizationId) {
        // ORG_ADMIN can see own password + FACILITATOR passwords in their org
        // CANNOT see SUPER_ADMIN passwords or other ORG_ADMIN passwords
        if (user.id === ctx.userId) {
          // Own password
          visiblePassword = user.plainPassword ? decrypt(user.plainPassword) : null
        } else if (
          user.organizationId === ctx.organizationId &&
          user.role === 'FACILITATOR'
        ) {
          // FACILITATOR passwords in same org
          visiblePassword = user.plainPassword ? decrypt(user.plainPassword) : null
        }
      }
      // FACILITATOR cannot see any passwords (visiblePassword stays null)

      // Remove plainPassword from response, add visiblePassword
      const { plainPassword, ...userWithoutPlainPassword } = user
      return {
        ...userWithoutPlainPassword,
        visiblePassword,
      }
    })

    return successResponse(usersWithPasswords, 200, { total, limit })
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}
