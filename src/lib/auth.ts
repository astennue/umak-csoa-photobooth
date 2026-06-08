import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'FACILITATOR'

export interface AuthContext {
  userId: string | null
  role: UserRole | null
  organizationId: string | null
  organizationName: string | null
}

/**
 * Get the current authenticated user's context from the server session.
 * Use this in API routes to determine role-based filtering.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      userId: null,
      role: null,
      organizationId: null,
      organizationName: null,
    }
  }

  const user = session.user as any

  return {
    userId: user.id || null,
    role: user.role || null,
    organizationId: user.organizationId || null,
    organizationName: user.organizationName || null,
  }
}

/**
 * Check if the user is a SUPER_ADMIN
 */
export function isSuperAdmin(ctx: AuthContext): boolean {
  return ctx.role === 'SUPER_ADMIN'
}

/**
 * Check if the user is an ORG_ADMIN
 */
export function isOrgAdmin(ctx: AuthContext): boolean {
  return ctx.role === 'ORG_ADMIN'
}

/**
 * Check if the user is a FACILITATOR
 */
export function isFacilitator(ctx: AuthContext): boolean {
  return ctx.role === 'FACILITATOR'
}

/**
 * Get the organization scope filter for the current user.
 * - SUPER_ADMIN: no filter (can see all)
 * - ORG_ADMIN: filter by their organizationId
 * - FACILITATOR: filter by their organizationId
 *
 * Returns the organizationId to filter by, or null if no filter needed (SUPER_ADMIN).
 */
export function getOrgScope(ctx: AuthContext): string | null {
  if (isSuperAdmin(ctx)) return null
  return ctx.organizationId
}

/**
 * Check if a user can access data belonging to a specific organization.
 */
export function canAccessOrg(ctx: AuthContext, targetOrgId: string | null): boolean {
  if (isSuperAdmin(ctx)) return true
  if (!ctx.organizationId) return false
  return ctx.organizationId === targetOrgId
}

/**
 * Check if a user can create/edit resources within a specific organization.
 */
export function canModifyOrg(ctx: AuthContext, targetOrgId: string | null): boolean {
  if (isSuperAdmin(ctx)) return true
  if (!ctx.organizationId) return false
  return ctx.organizationId === targetOrgId
}

/**
 * Extract userRole and userOrgId from search params (for REST API endpoints
 * that receive this info from the frontend).
 */
export function extractUserScope(searchParams: URLSearchParams): {
  userRole: string
  userOrgId: string
  needsOrgFilter: boolean
} {
  const userRole = searchParams.get('userRole') || ''
  const userOrgId = searchParams.get('userOrgId') || ''
  const needsOrgFilter =
    (userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR') && !!userOrgId

  return { userRole, userOrgId, needsOrgFilter }
}

/**
 * Apply organization scope filter to a Prisma where clause.
 * Mutates and returns the where clause.
 */
export function applyOrgFilter(
  where: Record<string, any>,
  userRole: string,
  userOrgId: string
): Record<string, any> {
  if ((userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR') && userOrgId) {
    where.organizationId = userOrgId
  }
  return where
}

/**
 * Apply organization scope for event-based filtering.
 * For entities that belong to events (sessions, queue, templates, gallery, devices),
 * we need to filter by events that belong to the user's org.
 */
export function applyEventOrgFilter(
  where: Record<string, any>,
  userRole: string,
  userOrgId: string
): Record<string, any> {
  if ((userRole === 'ORG_ADMIN' || userRole === 'FACILITATOR') && userOrgId) {
    where.event = { organizationId: userOrgId }
  }
  return where
}
