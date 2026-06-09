import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function GET() {
  try {
    // Check database connectivity
    const userCount = await db.user.count()
    const orgCount = await db.organization.count()
    const eventCount = await db.event.count()

    // Check if super admin exists
    const superAdmin = await db.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { email: true, active: true, role: true },
    })

    return successResponse({
      status: 'healthy',
      database: 'connected',
      counts: {
        users: userCount,
        organizations: orgCount,
        events: eventCount,
      },
      superAdminExists: !!superAdmin,
      superAdminActive: superAdmin?.active ?? false,
      superAdminEmail: superAdmin?.email ?? null,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return errorResponse(
      `Database connection failed: ${error.message}`,
      503
    )
  }
}
