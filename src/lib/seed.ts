import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { encrypt } from './crypto'

const SALT_ROUNDS = 12

const SUPER_ADMIN_ACCOUNTS = [
  {
    email: 'nuevasrein@gmail.com',
    password: 'ReinNuev060626',
    name: 'Reiner Nuevas',
    role: 'SUPER_ADMIN' as const,
  },
  {
    email: 'reinernuevas.work@gmail.com',
    password: 'ReinNuev060626',
    name: 'Reiner Nuevas (Work)',
    role: 'SUPER_ADMIN' as const,
  },
]

let seedingInProgress = false
let lastSeedResult: { success: boolean; timestamp: number } | null = null

export async function ensureSeeded(): Promise<{ wasSeeded: boolean; userCount: number }> {
  if (seedingInProgress) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      if (!seedingInProgress) break
    }
    const count = await db.user.count()
    return { wasSeeded: false, userCount: count }
  }

  if (lastSeedResult && Date.now() - lastSeedResult.timestamp < 60000) {
    const count = await db.user.count()
    return { wasSeeded: false, userCount: count }
  }

  const userCount = await db.user.count()
  if (userCount > 0) {
    lastSeedResult = { success: true, timestamp: Date.now() }
    return { wasSeeded: false, userCount }
  }

  seedingInProgress = true
  console.log('[Seed] Database is empty — auto-seeding Super Admin accounts...')

  try {
    await runSeed()
    const finalCount = await db.user.count()
    lastSeedResult = { success: true, timestamp: Date.now() }
    console.log(`[Seed] Auto-seed complete! ${finalCount} Super Admin accounts created.`)
    return { wasSeeded: true, userCount: finalCount }
  } catch (error) {
    console.error('[Seed] Auto-seed FAILED:', error)
    lastSeedResult = { success: false, timestamp: Date.now() }
    throw error
  } finally {
    seedingInProgress = false
  }
}

export async function runSeed(): Promise<void> {
  await db.auditLog.deleteMany()
  await db.device.deleteMany()
  await db.gallery.deleteMany()
  await db.template.deleteMany()
  await db.queueEntry.deleteMany()
  await db.session.deleteMany()
  await db.event.deleteMany()
  await db.user.deleteMany()
  await db.organization.deleteMany()

  for (const account of SUPER_ADMIN_ACCOUNTS) {
    const hashedPassword = await bcrypt.hash(account.password, SALT_ROUNDS)
    const encryptedPassword = encrypt(account.password)
    await db.user.upsert({
      where: { email: account.email },
      update: {
        password: hashedPassword,
        plainPassword: encryptedPassword,
        name: account.name,
        role: account.role,
        active: true,
      },
      create: {
        email: account.email,
        password: hashedPassword,
        plainPassword: encryptedPassword,
        name: account.name,
        role: account.role,
        active: true,
      },
    })
  }

  console.log('[Seed] Created/verified 2 Super Admin accounts. Database is otherwise empty.')
}

export async function resetAndSeed(): Promise<{ users: number }> {
  await runSeed()
  const users = await db.user.count()
  return { users }
}
