import { db } from '@/lib/db'
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils'
import { NextRequest } from 'next/server'
import { getAuthContext, getOrgScope } from '@/lib/auth'
import { decrypt } from '@/lib/crypto'

/**
 * Determine if the requesting user can see the target user's plain password.
 * - SUPER_ADMIN: sees ALL passwords
 * - ORG_ADMIN: sees own password + FACILITATOR passwords in their org only
 * - FACILITATOR: sees NO passwords
 */
function canSeePassword(
  ctx: { role: string | null; userId: string | null; organizationId: string | null },
  target: { id: string; role: string; organizationId: string | null }
): boolean {
  if (!ctx.role || !ctx.userId) return false
  if (ctx.role === 'SUPER_ADMIN') return true
  if (ctx.role === 'ORG_ADMIN' && ctx.organizationId) {
    if (target.id === ctx.userId) return true
    return target.organizationId === ctx.organizationId && target.role === 'FACILITATOR'
  }
  return false
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401)
    }

    const { page, limit, skip } = paginateRequest(request)
    const searchParams = getSearchParams(request)
    const search = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }
    if (roleFilter) {
      where.role = roleFilter
    }

    // RBAC: ORG_ADMIN and FACILITATOR can only see users in their own org
    const orgScope = getOrgScope(ctx)
    if (orgScope) {
      where.organizationId = orgScope
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
      const visiblePassword = canSeePassword(ctx, user) && user.plainPassword
        ? decrypt(user.plainPassword)
        : null

      const { plainPassword, ...userWithoutPlainPassword } = user
      return {
        ...userWithoutPlainPassword,
        visiblePassword,
      }
    })

    return successResponse(usersWithPasswords, 200, { total, page, limit })
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}
