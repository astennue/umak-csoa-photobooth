import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Clear all existing data (respecting foreign key constraints)
    await db.auditLog.deleteMany()
    await db.gallery.deleteMany()
    await db.queueEntry.deleteMany()
    await db.device.deleteMany()
    await db.template.deleteMany()
    await db.session.deleteMany()
    await db.user.deleteMany()
    await db.event.deleteMany()
    await db.organization.deleteMany()

    // ── Hash passwords ──────────────────────────────────────────────────
    const superAdminPassword = await bcrypt.hash('ReinNuev060626', 12)
    const orgAdminPassword = await bcrypt.hash('Password123!', 12)

    // ── Seed Organizations (UMak CSOA student organizations) ─────────────
    const orgCSOA = await db.organization.create({
      data: {
        name: 'UMak CSOA - Center for Student Organization and Activities',
        description: 'The main office overseeing all student organizations at the University of Makati',
        email: 'csoa@umak.edu.ph',
        phone: '+63-2-8822-5600',
        active: true,
      },
    })

    const orgStudentCouncil = await db.organization.create({
      data: {
        name: 'UMak Student Council',
        description: 'The official student government body of the University of Makati',
        email: 'studentcouncil@umak.edu.ph',
        phone: '+63-2-8822-5601',
        active: true,
      },
    })

    const orgDanceTroupe = await db.organization.create({
      data: {
        name: 'UMak Dance Troupe',
        description: 'The premier dance organization of the University of Makati, showcasing talent in various dance genres',
        email: 'dancetroupe@umak.edu.ph',
        active: true,
      },
    })

    const orgDebateSociety = await db.organization.create({
      data: {
        name: 'UMak Debate Society',
        description: 'Fostering critical thinking and public speaking excellence among UMak students',
        email: 'debate@umak.edu.ph',
        active: true,
      },
    })

    const orgPhotoClub = await db.organization.create({
      data: {
        name: 'UMak Photography Club',
        description: 'Capturing moments and developing photography skills among UMak students',
        email: 'photoclub@umak.edu.ph',
        active: true,
      },
    })

    // ── Seed Super Admin Users ──────────────────────────────────────────
    await db.user.create({
      data: {
        email: 'nuevasrein@gmail.com',
        password: superAdminPassword,
        name: 'Reiner Nuevas',
        role: 'SUPER_ADMIN',
        active: true,
      },
    })

    await db.user.create({
      data: {
        email: 'reinernuevas.work@gmail.com',
        password: superAdminPassword,
        name: 'Reiner Nuevas',
        role: 'SUPER_ADMIN',
        active: true,
      },
    })

    // ── Seed Org Admin Users ────────────────────────────────────────────
    await db.user.create({
      data: {
        email: 'admin.csoa@umak.edu.ph',
        password: orgAdminPassword,
        name: 'Maria Santos',
        role: 'ORG_ADMIN',
        organizationId: orgCSOA.id,
        active: true,
      },
    })

    await db.user.create({
      data: {
        email: 'admin.council@umak.edu.ph',
        password: orgAdminPassword,
        name: 'Juan Dela Cruz',
        role: 'ORG_ADMIN',
        organizationId: orgStudentCouncil.id,
        active: true,
      },
    })

    await db.user.create({
      data: {
        email: 'admin.dance@umak.edu.ph',
        password: orgAdminPassword,
        name: 'Angela Reyes',
        role: 'ORG_ADMIN',
        organizationId: orgDanceTroupe.id,
        active: true,
      },
    })

    await db.user.create({
      data: {
        email: 'admin.debate@umak.edu.ph',
        password: orgAdminPassword,
        name: 'Carlo Mendoza',
        role: 'ORG_ADMIN',
        organizationId: orgDebateSociety.id,
        active: true,
      },
    })

    await db.user.create({
      data: {
        email: 'admin.photo@umak.edu.ph',
        password: orgAdminPassword,
        name: 'Liza Garcia',
        role: 'ORG_ADMIN',
        organizationId: orgPhotoClub.id,
        active: true,
      },
    })

    // ── Seed Facilitator Users ──────────────────────────────────────────
    const facilitatorPassword = await bcrypt.hash('Facilitator123!', 12)

    await db.user.create({
      data: {
        email: 'facilitator1.csoa@umak.edu.ph',
        password: facilitatorPassword,
        name: 'Rica Villanueva',
        role: 'FACILITATOR',
        organizationId: orgCSOA.id,
        active: true,
      },
    })

    await db.user.create({
      data: {
        email: 'facilitator2.csoa@umak.edu.ph',
        password: facilitatorPassword,
        name: 'Mark Aquino',
        role: 'FACILITATOR',
        organizationId: orgCSOA.id,
        active: true,
      },
    })

    await db.user.create({
      data: {
        email: 'facilitator.council@umak.edu.ph',
        password: facilitatorPassword,
        name: 'Anna Lim',
        role: 'FACILITATOR',
        organizationId: orgStudentCouncil.id,
        active: true,
      },
    })

    // ── Seed Events ─────────────────────────────────────────────────────
    const eventFoundation = await db.event.create({
      data: {
        name: 'UMak Foundation Week 2025',
        description: 'Annual celebration of the University of Makati founding anniversary with week-long activities, exhibits, and programs',
        organizationId: orgCSOA.id,
        location: 'UMak Main Campus, J.P. Rizal Extension, Makati City',
        startDate: new Date('2025-01-20T08:00:00Z'),
        endDate: new Date('2025-01-25T22:00:00Z'),
        status: 'ACTIVE',
        maxSessions: 200,
      },
    })

    const eventOrgFair = await db.event.create({
      data: {
        name: 'Student Organizations Fair',
        description: 'Annual recruitment fair showcasing all student organizations and their activities',
        organizationId: orgCSOA.id,
        location: 'UMak Quadrangle',
        startDate: new Date('2025-02-10T09:00:00Z'),
        endDate: new Date('2025-02-12T17:00:00Z'),
        status: 'ACTIVE',
        maxSessions: 150,
      },
    })

    const eventCultural = await db.event.create({
      data: {
        name: 'Cultural Night 2025',
        description: 'An evening of cultural performances featuring dance, music, and theatrical presentations',
        organizationId: orgDanceTroupe.id,
        location: 'UMak Theater',
        startDate: new Date('2025-03-15T18:00:00Z'),
        endDate: new Date('2025-03-15T22:00:00Z'),
        status: 'DRAFT',
        maxSessions: 80,
      },
    })

    const eventDebate = await db.event.create({
      data: {
        name: 'Inter-Collegiate Debate Cup',
        description: 'Annual debate competition hosting students from various colleges and universities',
        organizationId: orgDebateSociety.id,
        location: 'UMak Conference Hall',
        startDate: new Date('2025-04-05T08:00:00Z'),
        endDate: new Date('2025-04-06T17:00:00Z'),
        status: 'ACTIVE',
        maxSessions: 100,
      },
    })

    const eventPhotoExhibit = await db.event.create({
      data: {
        name: 'Photography Exhibit 2025',
        description: 'Annual photography exhibition showcasing the best works of UMak Photography Club members',
        organizationId: orgPhotoClub.id,
        location: 'UMak Gallery Wing',
        startDate: new Date('2025-05-01T10:00:00Z'),
        endDate: new Date('2025-05-03T18:00:00Z'),
        status: 'DRAFT',
        maxSessions: 60,
      },
    })

    // ── Seed Sessions ───────────────────────────────────────────────────
    const session1 = await db.session.create({
      data: {
        eventId: eventFoundation.id,
        guestName: 'Alice Johnson',
        guestEmail: 'alice@umak.edu.ph',
        guestPhone: '+63-917-123-4567',
        status: 'COMPLETED',
        startedAt: new Date('2025-01-20T10:30:00Z'),
        completedAt: new Date('2025-01-20T10:45:00Z'),
      },
    })

    const session2 = await db.session.create({
      data: {
        eventId: eventFoundation.id,
        guestName: 'Bob Santos',
        guestEmail: 'bob@umak.edu.ph',
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-01-20T11:00:00Z'),
      },
    })

    const session3 = await db.session.create({
      data: {
        eventId: eventFoundation.id,
        guestName: 'Charlie Reyes',
        guestEmail: 'charlie@umak.edu.ph',
        status: 'SCHEDULED',
      },
    })

    const session4 = await db.session.create({
      data: {
        eventId: eventOrgFair.id,
        guestName: 'Diana Cruz',
        guestEmail: 'diana@umak.edu.ph',
        guestPhone: '+63-928-555-7890',
        status: 'COMPLETED',
        startedAt: new Date('2025-02-10T09:30:00Z'),
        completedAt: new Date('2025-02-10T09:45:00Z'),
      },
    })

    const session5 = await db.session.create({
      data: {
        eventId: eventDebate.id,
        guestName: 'Eduardo Ramos',
        guestEmail: 'eduardo@umak.edu.ph',
        status: 'SCHEDULED',
      },
    })

    // ── Seed Queue Entries ──────────────────────────────────────────────
    const q1 = await db.queueEntry.create({
      data: {
        eventId: eventFoundation.id,
        sessionId: session1.id,
        position: 1,
        name: 'Alice Johnson',
        email: 'alice@umak.edu.ph',
        status: 'COMPLETED',
        notifiedAt: new Date('2025-01-20T10:20:00Z'),
        activatedAt: new Date('2025-01-20T10:30:00Z'),
        completedAt: new Date('2025-01-20T10:45:00Z'),
      },
    })

    const q2 = await db.queueEntry.create({
      data: {
        eventId: eventFoundation.id,
        sessionId: session2.id,
        position: 2,
        name: 'Bob Santos',
        email: 'bob@umak.edu.ph',
        status: 'ACTIVE',
        notifiedAt: new Date('2025-01-20T10:50:00Z'),
        activatedAt: new Date('2025-01-20T11:00:00Z'),
      },
    })

    const q3 = await db.queueEntry.create({
      data: {
        eventId: eventFoundation.id,
        position: 3,
        name: 'Charlie Reyes',
        email: 'charlie@umak.edu.ph',
        status: 'WAITING',
      },
    })

    const q4 = await db.queueEntry.create({
      data: {
        eventId: eventFoundation.id,
        position: 4,
        name: 'Fatima Abdullah',
        email: 'fatima@umak.edu.ph',
        status: 'WAITING',
      },
    })

    const q5 = await db.queueEntry.create({
      data: {
        eventId: eventOrgFair.id,
        sessionId: session4.id,
        position: 1,
        name: 'Diana Cruz',
        email: 'diana@umak.edu.ph',
        status: 'COMPLETED',
        notifiedAt: new Date('2025-02-10T09:20:00Z'),
        activatedAt: new Date('2025-02-10T09:30:00Z'),
        completedAt: new Date('2025-02-10T09:45:00Z'),
      },
    })

    const q6 = await db.queueEntry.create({
      data: {
        eventId: eventDebate.id,
        sessionId: session5.id,
        position: 1,
        name: 'Eduardo Ramos',
        email: 'eduardo@umak.edu.ph',
        status: 'WAITING',
      },
    })

    // ── Seed Templates ──────────────────────────────────────────────────
    await db.template.create({
      data: {
        eventId: eventFoundation.id,
        name: 'UMak Foundation Frame',
        description: 'Official frame for UMak Foundation Week 2025 photobooth',
        frameUrl: '/templates/umak-foundation-frame.png',
        overlayUrl: '/templates/umak-foundation-overlay.png',
        settings: JSON.stringify({ width: 1920, height: 1080, format: 'PNG' }),
        active: true,
      },
    })

    await db.template.create({
      data: {
        eventId: eventFoundation.id,
        name: 'Green & Gold Minimal',
        description: 'Minimalist design with UMak green and gold accents',
        frameUrl: '/templates/green-gold-frame.png',
        active: true,
      },
    })

    await db.template.create({
      data: {
        eventId: eventOrgFair.id,
        name: 'Org Fair Banner Frame',
        description: 'Colorful frame for Student Organizations Fair',
        frameUrl: '/templates/org-fair-frame.png',
        active: true,
      },
    })

    await db.template.create({
      data: {
        eventId: eventCultural.id,
        name: 'Cultural Night Elegant',
        description: 'Elegant frame for Cultural Night performances',
        frameUrl: '/templates/cultural-night-frame.png',
        active: true,
      },
    })

    await db.template.create({
      data: {
        eventId: eventDebate.id,
        name: 'Debate Cup Frame',
        description: 'Official frame for Inter-Collegiate Debate Cup',
        frameUrl: '/templates/debate-cup-frame.png',
        active: true,
      },
    })

    // ── Seed Gallery ────────────────────────────────────────────────────
    await db.gallery.create({
      data: {
        eventId: eventFoundation.id,
        sessionId: session1.id,
        photoUrl: '/photos/alice-foundation-1.jpg',
        thumbnailUrl: '/photos/thumbs/alice-foundation-1.jpg',
        caption: 'Alice at the UMak Foundation Week!',
        isPublic: true,
        isFavorite: true,
      },
    })

    await db.gallery.create({
      data: {
        eventId: eventFoundation.id,
        sessionId: session1.id,
        photoUrl: '/photos/alice-foundation-2.jpg',
        thumbnailUrl: '/photos/thumbs/alice-foundation-2.jpg',
        caption: 'Group shot with friends',
        isPublic: true,
      },
    })

    await db.gallery.create({
      data: {
        eventId: eventFoundation.id,
        sessionId: session2.id,
        photoUrl: '/photos/bob-foundation-1.jpg',
        caption: 'Bob in the photobooth',
        isPublic: false,
      },
    })

    await db.gallery.create({
      data: {
        eventId: eventOrgFair.id,
        sessionId: session4.id,
        photoUrl: '/photos/diana-orgfair-1.jpg',
        thumbnailUrl: '/photos/thumbs/diana-orgfair-1.jpg',
        caption: 'Diana at the Org Fair!',
        isPublic: true,
        isFavorite: true,
      },
    })

    // ── Seed Devices ────────────────────────────────────────────────────
    await db.device.create({
      data: {
        eventId: eventFoundation.id,
        name: 'Booth A - Main Hall',
        type: 'PHOTOBOOTH',
        status: 'ONLINE',
        ipAddress: '192.168.1.100',
        firmware: 'v2.1.0',
        lastHeartbeat: new Date(),
      },
    })

    await db.device.create({
      data: {
        eventId: eventFoundation.id,
        name: 'Printer Station 1',
        type: 'PRINTER',
        status: 'ONLINE',
        ipAddress: '192.168.1.101',
        firmware: 'v1.5.2',
        lastHeartbeat: new Date(),
      },
    })

    await db.device.create({
      data: {
        eventId: eventOrgFair.id,
        name: 'Kiosk - Quadrangle Entry',
        type: 'KIOSK',
        status: 'ONLINE',
        ipAddress: '192.168.2.50',
        firmware: 'v3.0.1',
        lastHeartbeat: new Date(),
      },
    })

    await db.device.create({
      data: {
        eventId: eventDebate.id,
        name: 'Booth B - Conference Hall',
        type: 'PHOTOBOOTH',
        status: 'OFFLINE',
        ipAddress: '192.168.3.100',
      },
    })

    // ── Seed Audit Logs ─────────────────────────────────────────────────
    await db.auditLog.createMany({
      data: [
        { organizationId: orgCSOA.id, eventId: eventFoundation.id, action: 'CREATE', entityType: 'Event', entityId: eventFoundation.id, performedBy: 'Reiner Nuevas' },
        { organizationId: orgCSOA.id, eventId: eventFoundation.id, action: 'UPDATE', entityType: 'Event', entityId: eventFoundation.id, details: JSON.stringify({ field: 'status', from: 'DRAFT', to: 'ACTIVE' }), performedBy: 'Reiner Nuevas' },
        { organizationId: orgCSOA.id, eventId: eventFoundation.id, sessionId: session1.id, action: 'CREATE', entityType: 'Session', entityId: session1.id, performedBy: 'system' },
        { organizationId: orgCSOA.id, eventId: eventFoundation.id, action: 'QUEUE_ADD', entityType: 'QueueEntry', entityId: q3.id, performedBy: 'kiosk' },
        { organizationId: orgCSOA.id, eventId: eventOrgFair.id, action: 'CREATE', entityType: 'Event', entityId: eventOrgFair.id, performedBy: 'Maria Santos' },
        { organizationId: orgDanceTroupe.id, eventId: eventCultural.id, action: 'CREATE', entityType: 'Event', entityId: eventCultural.id, performedBy: 'Angela Reyes' },
        { organizationId: orgDebateSociety.id, eventId: eventDebate.id, action: 'CREATE', entityType: 'Event', entityId: eventDebate.id, performedBy: 'Carlo Mendoza' },
        { organizationId: orgPhotoClub.id, eventId: eventPhotoExhibit.id, action: 'CREATE', entityType: 'Event', entityId: eventPhotoExhibit.id, performedBy: 'Liza Garcia' },
      ],
    })

    return successResponse({
      message: 'Database reseeded successfully with UMak CSOA data',
      counts: {
        organizations: 5,
        users: 9,
        events: 5,
        sessions: 5,
        queueEntries: 6,
        templates: 5,
        gallery: 4,
        devices: 4,
        auditLogs: 8,
      },
    })
  } catch (err: any) {
    return errorResponse(err.message, 500)
  }
}
