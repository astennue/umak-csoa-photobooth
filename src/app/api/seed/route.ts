import { NextResponse } from 'next/server'
import { resetAndSeed } from '@/lib/seed'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthContext } from '@/lib/auth'

export async function POST() {
  try {
    // Protect: Only SUPER_ADMIN can reset the database
    const ctx = await getAuthContext()
    if (!ctx.userId || ctx.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        success: false,
        error: { message: 'Unauthorized. Only Super Admins can reset the database.' },
      }, { status: 403 })
    }

    console.log('[Seed API] Resetting database and seeding Super Admin accounts only...')

    const result = await resetAndSeed()

    // Verify the seed worked
    const testUser = await db.user.findUnique({ where: { email: 'nuevasrein@gmail.com' } })
    const testPassword = testUser ? await bcrypt.compare('ReinNuev060626', testUser.password) : false

    console.log(`[Seed API] Complete! ${result.users} users, password valid: ${testPassword}`)

    return NextResponse.json({
      success: true,
      message: 'Database reset. Only 2 Super Admin accounts exist. No organizations, events, or other data.',
      counts: {
        users: result.users,
        organizations: 0,
        events: 0,
        sessions: 0,
        queueEntries: 0,
        templates: 0,
        gallery: 0,
        devices: 0,
        auditLogs: 0,
      },
      verification: {
        testUserFound: !!testUser,
        testPasswordValid: testPassword,
      },
    })
  } catch (err: any) {
    console.error('[Seed API] Failed:', err)
    return NextResponse.json({
      success: false,
      error: { message: err?.message || String(err) },
    }, { status: 500 })
  }
}
