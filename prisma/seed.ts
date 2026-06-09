import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SALT_ROUNDS = 12

async function main() {
  console.log('🌱 Seeding Supabase database...')

  // ─── Clean up existing data (reverse dependency order) ───
  console.log('🧹 Cleaning existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.device.deleteMany()
  await prisma.gallery.deleteMany()
  await prisma.template.deleteMany()
  await prisma.queueEntry.deleteMany()
  await prisma.session.deleteMany()
  await prisma.event.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
  console.log('✅ Cleaned up existing data')

  // ─── Organizations ───
  console.log('🏢 Creating organizations...')
  const orgs = await Promise.all([
    prisma.organization.create({
      data: {
        name: 'CSOA - Council of Student Organizations',
        description: 'The umbrella organization governing all student organizations at UMak',
        email: 'csoa@umak.edu.ph',
        phone: '+63-2-8888-1000',
        active: true,
      },
    }),
    prisma.organization.create({
      data: {
        name: 'UMak Dance Troupe',
        description: 'Official dance organization of the University of Makati',
        email: 'dance@umak.edu.ph',
        active: true,
      },
    }),
    prisma.organization.create({
      data: {
        name: 'UMak Debate Society',
        description: 'The official debate organization of the University of Makati',
        email: 'debate@umak.edu.ph',
        active: true,
      },
    }),
    prisma.organization.create({
      data: {
        name: 'UMak Photography Club',
        description: 'Capturing moments, creating memories across campus',
        email: 'photo@umak.edu.ph',
        active: true,
      },
    }),
    prisma.organization.create({
      data: {
        name: 'UMak Student Council',
        description: 'The official student government of the University of Makati',
        email: 'council@umak.edu.ph',
        active: true,
      },
    }),
  ])
  console.log(`✅ Created ${orgs.length} organizations`)

  // ─── Users ───
  console.log('👤 Creating users...')
  const users = await Promise.all([
    // Super Admin
    prisma.user.create({
      data: {
        email: 'nuevasrein@gmail.com',
        password: await bcrypt.hash('ReinNuev060626', SALT_ROUNDS),
        name: 'Reiner Nuevas',
        role: 'SUPER_ADMIN',
        active: true,
      },
    }),
    // Second Super Admin
    prisma.user.create({
      data: {
        email: 'reinernuevas.work@gmail.com',
        password: await bcrypt.hash('ReinNuev060626', SALT_ROUNDS),
        name: 'Reiner Nuevas (Work)',
        role: 'SUPER_ADMIN',
        active: true,
      },
    }),
    // Co-Super Admin
    prisma.user.create({
      data: {
        email: 'cosuperadmin@umak.edu.ph',
        password: await bcrypt.hash('CoAdmin123!', SALT_ROUNDS),
        name: 'Co-Super Admin',
        role: 'CO_SUPER_ADMIN',
        active: true,
      },
    }),
    // CSOA Org Admin
    prisma.user.create({
      data: {
        email: 'admin.csoa@umak.edu.ph',
        password: await bcrypt.hash('Password123!', SALT_ROUNDS),
        name: 'CSOA Admin',
        role: 'ORG_ADMIN',
        organizationId: orgs[0].id, // CSOA
        active: true,
      },
    }),
    // Dance Org Admin
    prisma.user.create({
      data: {
        email: 'admin.dance@umak.edu.ph',
        password: await bcrypt.hash('Password123!', SALT_ROUNDS),
        name: 'Dance Troupe Admin',
        role: 'ORG_ADMIN',
        organizationId: orgs[1].id, // Dance
        active: true,
      },
    }),
    // Debate Org Admin
    prisma.user.create({
      data: {
        email: 'admin.debate@umak.edu.ph',
        password: await bcrypt.hash('Password123!', SALT_ROUNDS),
        name: 'Debate Society Admin',
        role: 'ORG_ADMIN',
        organizationId: orgs[2].id, // Debate
        active: true,
      },
    }),
    // Photo Org Admin
    prisma.user.create({
      data: {
        email: 'admin.photo@umak.edu.ph',
        password: await bcrypt.hash('Password123!', SALT_ROUNDS),
        name: 'Photography Club Admin',
        role: 'ORG_ADMIN',
        organizationId: orgs[3].id, // Photo
        active: true,
      },
    }),
    // Student Council Org Admin
    prisma.user.create({
      data: {
        email: 'admin.council@umak.edu.ph',
        password: await bcrypt.hash('Password123!', SALT_ROUNDS),
        name: 'Student Council Admin',
        role: 'ORG_ADMIN',
        organizationId: orgs[4].id, // Council
        active: true,
      },
    }),
    // CSOA Facilitator 1
    prisma.user.create({
      data: {
        email: 'facilitator1.csoa@umak.edu.ph',
        password: await bcrypt.hash('Facilitator123!', SALT_ROUNDS),
        name: 'CSOA Facilitator 1',
        role: 'FACILITATOR',
        organizationId: orgs[0].id, // CSOA
        active: true,
      },
    }),
    // CSOA Facilitator 2
    prisma.user.create({
      data: {
        email: 'facilitator2.csoa@umak.edu.ph',
        password: await bcrypt.hash('Facilitator123!', SALT_ROUNDS),
        name: 'CSOA Facilitator 2',
        role: 'FACILITATOR',
        organizationId: orgs[0].id, // CSOA
        active: true,
      },
    }),
    // Council Facilitator
    prisma.user.create({
      data: {
        email: 'facilitator.council@umak.edu.ph',
        password: await bcrypt.hash('Facilitator123!', SALT_ROUNDS),
        name: 'Council Facilitator',
        role: 'FACILITATOR',
        organizationId: orgs[4].id, // Council
        active: true,
      },
    }),
  ])
  console.log(`✅ Created ${users.length} users`)

  // ─── Events ───
  console.log('📅 Creating events...')
  const events = await Promise.all([
    prisma.event.create({
      data: {
        name: 'CSOA Week 2025',
        description: 'Annual CSOA Week celebration featuring various student organization activities',
        organizationId: orgs[0].id,
        location: 'UMak Main Campus, Activity Center',
        startDate: new Date('2025-02-10T09:00:00'),
        endDate: new Date('2025-02-14T17:00:00'),
        status: 'ACTIVE',
        maxSessions: 200,
      },
    }),
    prisma.event.create({
      data: {
        name: 'Dance Showcase 2025',
        description: 'Annual dance showcase featuring performances from all dance troupes',
        organizationId: orgs[1].id,
        location: 'UMak Theater',
        startDate: new Date('2025-03-15T18:00:00'),
        endDate: new Date('2025-03-15T21:00:00'),
        status: 'DRAFT',
        maxSessions: 50,
      },
    }),
    prisma.event.create({
      data: {
        name: 'Inter-School Debate Cup',
        description: 'Inter-school debate competition hosted by UMak Debate Society',
        organizationId: orgs[2].id,
        location: 'UMak Conference Hall',
        startDate: new Date('2025-04-01T08:00:00'),
        endDate: new Date('2025-04-02T17:00:00'),
        status: 'ACTIVE',
        maxSessions: 32,
      },
    }),
    prisma.event.create({
      data: {
        name: 'Photography Exhibit: Campus Through the Lens',
        description: 'Photography exhibit showcasing campus life through student lenses',
        organizationId: orgs[3].id,
        location: 'UMak Gallery Wing',
        startDate: new Date('2025-03-20T10:00:00'),
        endDate: new Date('2025-03-25T18:00:00'),
        status: 'ACTIVE',
        maxSessions: 100,
      },
    }),
    prisma.event.create({
      data: {
        name: 'Student Council Election 2025',
        description: 'Annual student council election and campaign event',
        organizationId: orgs[4].id,
        location: 'UMak Main Campus',
        startDate: new Date('2025-05-01T08:00:00'),
        endDate: new Date('2025-05-02T17:00:00'),
        status: 'COMPLETED',
        maxSessions: 500,
      },
    }),
  ])
  console.log(`✅ Created ${events.length} events`)

  // ─── Sessions ───
  console.log('📋 Creating sessions...')
  const sessionData = [
    { guestName: 'Maria Santos', guestEmail: 'maria.santos@student.umak.edu.ph', guestPhone: '+63-917-123-4567', status: 'COMPLETED', eventIdx: 0 },
    { guestName: 'Juan Dela Cruz', guestEmail: 'juan.delacruz@student.umak.edu.ph', guestPhone: '+63-918-234-5678', status: 'COMPLETED', eventIdx: 0 },
    { guestName: 'Ana Reyes', guestEmail: 'ana.reyes@student.umak.edu.ph', guestPhone: '+63-919-345-6789', status: 'IN_PROGRESS', eventIdx: 0 },
    { guestName: 'Pedro Garcia', guestEmail: 'pedro.garcia@student.umak.edu.ph', guestPhone: '+63-920-456-7890', status: 'SCHEDULED', eventIdx: 0 },
    { guestName: 'Lisa Ramos', guestEmail: 'lisa.ramos@student.umak.edu.ph', status: 'SCHEDULED', eventIdx: 0 },
    { guestName: 'Carlos Villanueva', guestEmail: 'carlos.v@student.umak.edu.ph', status: 'COMPLETED', eventIdx: 2 },
    { guestName: 'Sofia Mendoza', guestEmail: 'sofia.m@student.umak.edu.ph', status: 'SCHEDULED', eventIdx: 2 },
    { guestName: 'Diego Torres', guestEmail: 'diego.t@student.umak.edu.ph', status: 'IN_PROGRESS', eventIdx: 3 },
    { guestName: 'Elena Cruz', guestEmail: 'elena.c@student.umak.edu.ph', status: 'SCHEDULED', eventIdx: 3 },
    { guestName: 'Marco Aquino', guestEmail: 'marco.a@student.umak.edu.ph', status: 'COMPLETED', eventIdx: 4 },
  ]

  const sessions = await Promise.all(
    sessionData.map((s) =>
      prisma.session.create({
        data: {
          eventId: events[s.eventIdx].id,
          guestName: s.guestName,
          guestEmail: s.guestEmail,
          guestPhone: s.guestPhone,
          status: s.status,
          startedAt: s.status === 'COMPLETED' || s.status === 'IN_PROGRESS' ? new Date() : null,
          completedAt: s.status === 'COMPLETED' ? new Date() : null,
          notes: s.status === 'COMPLETED' ? 'Session completed successfully' : null,
        },
      })
    )
  )
  console.log(`✅ Created ${sessions.length} sessions`)

  // ─── Queue Entries ───
  console.log('📋 Creating queue entries...')
  const queueEntries = await Promise.all([
    prisma.queueEntry.create({
      data: {
        eventId: events[0].id,
        sessionId: sessions[3].id,
        position: 1,
        status: 'WAITING',
        name: 'Pedro Garcia',
        email: 'pedro.garcia@student.umak.edu.ph',
        phone: '+63-920-456-7890',
      },
    }),
    prisma.queueEntry.create({
      data: {
        eventId: events[0].id,
        sessionId: sessions[4].id,
        position: 2,
        status: 'WAITING',
        name: 'Lisa Ramos',
        email: 'lisa.ramos@student.umak.edu.ph',
      },
    }),
    prisma.queueEntry.create({
      data: {
        eventId: events[2].id,
        sessionId: sessions[6].id,
        position: 1,
        status: 'NOTIFIED',
        name: 'Sofia Mendoza',
        email: 'sofia.m@student.umak.edu.ph',
        notifiedAt: new Date(),
      },
    }),
    prisma.queueEntry.create({
      data: {
        eventId: events[3].id,
        sessionId: sessions[8].id,
        position: 1,
        status: 'WAITING',
        name: 'Elena Cruz',
        email: 'elena.c@student.umak.edu.ph',
      },
    }),
  ])
  console.log(`✅ Created ${queueEntries.length} queue entries`)

  // ─── Templates ───
  console.log('🎨 Creating templates...')
  const templates = await Promise.all([
    prisma.template.create({
      data: {
        eventId: events[0].id,
        name: 'CSOA Week Standard Frame',
        description: 'Standard photobooth frame for CSOA Week 2025',
        settings: JSON.stringify({ width: 1200, height: 800, frameColor: '#065f46' }),
        active: true,
      },
    }),
    prisma.template.create({
      data: {
        eventId: events[0].id,
        name: 'CSOA Week VIP Frame',
        description: 'VIP photobooth frame with gold accents',
        settings: JSON.stringify({ width: 1200, height: 800, frameColor: '#d97706' }),
        active: true,
      },
    }),
    prisma.template.create({
      data: {
        eventId: events[2].id,
        name: 'Debate Cup Frame',
        description: 'Debate cup themed photobooth frame',
        settings: JSON.stringify({ width: 1200, height: 800, frameColor: '#1e40af' }),
        active: true,
      },
    }),
  ])
  console.log(`✅ Created ${templates.length} templates`)

  // ─── Gallery ───
  console.log('🖼️ Creating gallery entries...')
  const galleryEntries = await Promise.all([
    prisma.gallery.create({
      data: {
        eventId: events[0].id,
        sessionId: sessions[0].id,
        photoUrl: '/gallery/csoa-week-001.jpg',
        thumbnailUrl: '/gallery/thumbs/csoa-week-001.jpg',
        caption: 'Maria Santos at CSOA Week Photobooth',
        isPublic: true,
        isFavorite: true,
      },
    }),
    prisma.gallery.create({
      data: {
        eventId: events[0].id,
        sessionId: sessions[1].id,
        photoUrl: '/gallery/csoa-week-002.jpg',
        thumbnailUrl: '/gallery/thumbs/csoa-week-002.jpg',
        caption: 'Juan Dela Cruz at CSOA Week Photobooth',
        isPublic: true,
        isFavorite: false,
      },
    }),
  ])
  console.log(`✅ Created ${galleryEntries.length} gallery entries`)

  // ─── Devices ───
  console.log('🖥️ Creating devices...')
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        eventId: events[0].id,
        name: 'Photobooth Station 1',
        type: 'PHOTOBOOTH',
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        ipAddress: '192.168.1.101',
        firmware: 'v2.1.0',
      },
    }),
    prisma.device.create({
      data: {
        eventId: events[0].id,
        name: 'Photobooth Station 2',
        type: 'PHOTOBOOTH',
        status: 'OFFLINE',
        ipAddress: '192.168.1.102',
        firmware: 'v2.1.0',
      },
    }),
    prisma.device.create({
      data: {
        eventId: events[2].id,
        name: 'Debate Photobooth',
        type: 'PHOTOBOOTH',
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        ipAddress: '192.168.1.201',
        firmware: 'v2.0.5',
      },
    }),
  ])
  console.log(`✅ Created ${devices.length} devices`)

  // ─── Audit Logs ───
  console.log('📝 Creating audit logs...')
  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        organizationId: orgs[0].id,
        eventId: events[0].id,
        userId: users[0].id,
        action: 'CREATE',
        entityType: 'Event',
        entityId: events[0].id,
        details: 'Created CSOA Week 2025 event',
        performedBy: users[0].name,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: orgs[0].id,
        userId: users[3].id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: users[3].id,
        details: 'CSOA Admin logged in',
        performedBy: users[3].name,
      },
    }),
  ])
  console.log(`✅ Created ${auditLogs.length} audit logs`)

  // ─── Summary ───
  const finalCount = await prisma.user.count()
  console.log('\n🎉 Seeding complete!')
  console.log(`📊 Summary:`)
  console.log(`   Organizations: ${orgs.length}`)
  console.log(`   Users: ${users.length} (verified: ${finalCount} in DB)`)
  console.log(`   Events: ${events.length}`)
  console.log(`   Sessions: ${sessions.length}`)
  console.log(`   Queue Entries: ${queueEntries.length}`)
  console.log(`   Templates: ${templates.length}`)
  console.log(`   Gallery: ${galleryEntries.length}`)
  console.log(`   Devices: ${devices.length}`)
  console.log(`   Audit Logs: ${auditLogs.length}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
