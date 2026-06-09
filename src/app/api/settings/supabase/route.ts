import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { db } from '@/lib/db'

// GET /api/settings/supabase — Get current Supabase configuration (masked)
export async function GET() {
  try {
    const configs = await db.supabaseConfig.findMany()
    const data = configs.map(c => ({
      key: c.key,
      value: c.key === 'service_role_key' && c.value
        ? c.value.substring(0, 10) + '...' + c.value.substring(c.value.length - 4)
        : c.value,
      isSet: !!c.value,
    }))
    return successResponse(data)
  } catch (error) {
    return errorResponse('Failed to get settings', 500)
  }
}

// POST /api/settings/supabase — Save Supabase configuration
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext()
    if (!authContext.userId) {
      return errorResponse('Authentication required', 401)
    }

    const body = await request.json()
    const { supabaseUrl, serviceRoleKey } = body

    if (!supabaseUrl && !serviceRoleKey) {
      return errorResponse('No configuration provided', 400)
    }

    // Upsert URL
    if (supabaseUrl !== undefined) {
      await db.supabaseConfig.upsert({
        where: { key: 'supabase_url' },
        update: { value: supabaseUrl },
        create: { key: 'supabase_url', value: supabaseUrl },
      })
    }

    // Upsert service role key
    if (serviceRoleKey !== undefined) {
      await db.supabaseConfig.upsert({
        where: { key: 'service_role_key' },
        update: { value: serviceRoleKey },
        create: { key: 'service_role_key', value: serviceRoleKey },
      })
    }

    // Reset the Supabase client singleton so new credentials are picked up
    const { resetSupabaseClient } = await import('@/lib/supabase-storage')
    resetSupabaseClient()

    return successResponse({ message: 'Supabase configuration saved' })
  } catch (error) {
    return errorResponse('Failed to save settings', 500)
  }
}

// DELETE /api/settings/supabase — Clear Supabase configuration
export async function DELETE() {
  try {
    const authContext = await getAuthContext()
    if (!authContext.userId) {
      return errorResponse('Authentication required', 401)
    }

    await db.supabaseConfig.deleteMany()

    const { resetSupabaseClient } = await import('@/lib/supabase-storage')
    resetSupabaseClient()

    return successResponse({ message: 'Supabase configuration cleared' })
  } catch (error) {
    return errorResponse('Failed to clear settings', 500)
  }
}
