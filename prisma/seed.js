/**
 * Build-time seed script for Vercel deployment.
 * Runs during `prisma db seed` or directly via `node prisma/seed.js`
 *
 * Seeds ONLY the 2 Super Admin accounts.
 * No organizations, events, sessions, or any other data.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const SALT_ROUNDS = 12

const SUPER_ADMINS = [
  {
    email: 'nuevasrein@gmail.com',
    password: 'ReinNuev060626',
    name: 'Reiner Nuevas',
    role: 'SUPER_ADMIN',
  },
  {
    email: 'reinernuevas.work@gmail.com',
    password: 'ReinNuev060626',
    name: 'Reiner Nuevas (Work)',
    role: 'SUPER_ADMIN',
  },
]

async function main() {
  console.log('[Build Seed] Starting...')

  const db = new PrismaClient()

  try {
    // Check if Super Admins already exist
    const existingCount = await db.user.count({
      where: { role: 'SUPER_ADMIN' },
    })

    if (existingCount >= 2) {
      console.log(`[Build Seed] ${existingCount} Super Admins already exist. Skipping seed.`)
      return
    }

    // Clean up only if DB has stale data (not the 2 Super Admins)
    if (existingCount === 0) {
      const totalUsers = await db.user.count()
      if (totalUsers > 0) {
        console.log(`[Build Seed] Found ${totalUsers} non-Super-Admin users. Cleaning up...`)
        // Clean all data respecting FK constraints
        await db.auditLog.deleteMany()
        await db.device.deleteMany()
        await db.gallery.deleteMany()
        await db.template.deleteMany()
        await db.queueEntry.deleteMany()
        await db.session.deleteMany()
        await db.event.deleteMany()
        await db.user.deleteMany()
        await db.organization.deleteMany()
      }
    }

    // Create the Super Admin accounts using upsert for safety
    for (const admin of SUPER_ADMINS) {
      const hashedPassword = await bcrypt.hash(admin.password, SALT_ROUNDS)
      await db.user.upsert({
        where: { email: admin.email },
        update: {
          password: hashedPassword,
          name: admin.name,
          role: admin.role,
          active: true,
        },
        create: {
          email: admin.email,
          password: hashedPassword,
          name: admin.name,
          role: admin.role,
          active: true,
        },
      })
      console.log(`[Build Seed] Upserted: ${admin.email}`)
    }

    const finalCount = await db.user.count()
    console.log(`[Build Seed] Complete! ${finalCount} users in database.`)

    // Verify
    const testUser = await db.user.findUnique({ where: { email: 'nuevasrein@gmail.com' } })
    if (testUser) {
      const valid = await bcrypt.compare('ReinNuev060626', testUser.password)
      console.log(`[Build Seed] Password verification: ${valid ? 'PASS' : 'FAIL'}`)
    }
  } catch (error) {
    console.error('[Build Seed] Error:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
