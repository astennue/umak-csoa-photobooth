import { db } from '@/lib/db'
import { successResponse, errorResponse, paginateRequest, getSearchParams } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
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

    return successResponse(users, 200, { total, limit })
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}
