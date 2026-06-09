import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { runSeed } from '@/lib/seed'

export async function POST(request: Request) {
  try {
    console.log('[Seed API] Starting database seed...')
    await runSeed()

    const finalCount = await db.user.count()
    const testUser = await db.user.findUnique({ where: { email: 'nuevasrein@gmail.com' } })
    const testPassword = testUser ? await bcrypt.compare('ReinNuev060626', testUser.password) : false

    console.log(`[Seed API] Complete! ${finalCount} users`)

    return NextResponse.json({
      success: true,
      summary: {
        users: finalCount,
        verification: {
          testUserFound: !!testUser,
          testPasswordValid: testPassword,
        },
      },
    })
  } catch (error: any) {
    console.error('[Seed API] Failed:', error)
    return NextResponse.json({
      success: false,
      error: { message: error?.message || String(error) },
    }, { status: 500 })
  }
}
