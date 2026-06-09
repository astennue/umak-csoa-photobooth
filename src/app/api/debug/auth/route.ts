import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    step: '',
    success: false,
  }

  try {
    diagnostics.step = 'env-check'
    diagnostics.env = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasAuthTrustHost: process.env.AUTH_TRUST_HOST === 'true',
      nodeEnv: process.env.NODE_ENV,
      databaseHost: process.env.DATABASE_URL
        ? new URL(process.env.DATABASE_URL.replace('postgresql://', 'http://')).hostname
        : '(not set)',
    }

    diagnostics.step = 'db-connect'
    const startTime = Date.now()
    await db.$queryRaw`SELECT 1 as test`
    diagnostics.dbPingMs = Date.now() - startTime
    diagnostics.dbConnected = true

    diagnostics.step = 'user-count'
    const userCount = await db.user.count()
    diagnostics.userCount = userCount

    if (userCount === 0) {
      diagnostics.success = true
      diagnostics.needsSeed = true
      diagnostics.step = 'complete'
      return NextResponse.json(diagnostics, { status: 200 })
    }

    diagnostics.step = 'user-lookup'
    const testEmail = 'nuevasrein@gmail.com'
    const user = await db.user.findUnique({
      where: { email: testEmail },
      select: { id: true, email: true, name: true, role: true, active: true, password: true },
    })

    if (!user) {
      diagnostics.userLookup = { found: false, email: testEmail }
      diagnostics.success = true
      diagnostics.step = 'complete'
      return NextResponse.json(diagnostics, { status: 200 })
    }

    diagnostics.userLookup = { found: true, email: user.email, name: user.name, role: user.role, active: user.active }

    diagnostics.step = 'password-test'
    const isValid = await bcrypt.compare('ReinNuev060626', user.password)
    diagnostics.passwordTest = { isValid }

    diagnostics.step = 'complete'
    diagnostics.success = true
  } catch (error: any) {
    diagnostics.error = { message: error?.message || String(error) }
    diagnostics.success = false
  }

  return NextResponse.json(diagnostics, { status: 200 })
}
