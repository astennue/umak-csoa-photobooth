import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function POST() {
  try {
    // Clear all existing data (respecting foreign key constraints)
    await db.auditLog.deleteMany();
    await db.gallery.deleteMany();
    await db.queueEntry.deleteMany();
    await db.device.deleteMany();
    await db.template.deleteMany();
    await db.session.deleteMany();
    await db.event.deleteMany();
    await db.organization.deleteMany();

    // Seed organizations
    const org1 = await db.organization.create({
      data: {
        name: 'CSOA Productions',
        description: 'Professional event photography and photobooth services',
        email: 'info@csoa-productions.com',
        phone: '+1-555-0100',
        active: true,
      },
    });

    const org2 = await db.organization.create({
      data: {
        name: 'SnapHappy Events',
        description: 'Fun photobooth experiences for all occasions',
        email: 'hello@snaphappy.events',
        phone: '+1-555-0200',
        active: true,
      },
    });

    const org3 = await db.organization.create({
      data: {
        name: 'Inactive Corp',
        description: 'This organization is inactive',
        email: 'old@inactive.com',
        active: false,
      },
    });

    // Seed events
    const event1 = await db.event.create({
      data: {
        name: 'Annual Tech Gala 2025',
        description: 'Premier technology awards ceremony',
        organizationId: org1.id,
        location: 'Grand Ballroom, Hilton',
        startDate: new Date('2025-03-15T18:00:00Z'),
        endDate: new Date('2025-03-15T23:00:00Z'),
        status: 'ACTIVE',
        maxSessions: 200,
      },
    });

    const event2 = await db.event.create({
      data: {
        name: 'Summer Music Festival',
        description: 'Outdoor music festival with photo experiences',
        organizationId: org1.id,
        location: 'Central Park',
        startDate: new Date('2025-07-04T10:00:00Z'),
        endDate: new Date('2025-07-06T22:00:00Z'),
        status: 'DRAFT',
        maxSessions: 500,
      },
    });

    const event3 = await db.event.create({
      data: {
        name: 'Wedding Expo 2025',
        description: 'Annual wedding planning expo',
        organizationId: org2.id,
        location: 'Convention Center',
        startDate: new Date('2025-05-20T09:00:00Z'),
        endDate: new Date('2025-05-21T17:00:00Z'),
        status: 'ACTIVE',
        maxSessions: 150,
      },
    });

    // Seed sessions for event1
    const session1 = await db.session.create({
      data: {
        eventId: event1.id,
        guestName: 'Alice Johnson',
        guestEmail: 'alice@example.com',
        guestPhone: '+1-555-1001',
        status: 'COMPLETED',
        startedAt: new Date('2025-03-15T18:30:00Z'),
        completedAt: new Date('2025-03-15T18:45:00Z'),
      },
    });

    const session2 = await db.session.create({
      data: {
        eventId: event1.id,
        guestName: 'Bob Smith',
        guestEmail: 'bob@example.com',
        status: 'IN_PROGRESS',
        startedAt: new Date('2025-03-15T19:00:00Z'),
      },
    });

    const session3 = await db.session.create({
      data: {
        eventId: event1.id,
        guestName: 'Charlie Brown',
        guestEmail: 'charlie@example.com',
        status: 'SCHEDULED',
      },
    });

    // Seed queue entries for event1
    const q1 = await db.queueEntry.create({
      data: {
        eventId: event1.id,
        sessionId: session1.id,
        position: 1,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        status: 'COMPLETED',
        notifiedAt: new Date('2025-03-15T18:20:00Z'),
        activatedAt: new Date('2025-03-15T18:30:00Z'),
        completedAt: new Date('2025-03-15T18:45:00Z'),
      },
    });

    const q2 = await db.queueEntry.create({
      data: {
        eventId: event1.id,
        sessionId: session2.id,
        position: 2,
        name: 'Bob Smith',
        email: 'bob@example.com',
        status: 'ACTIVE',
        notifiedAt: new Date('2025-03-15T18:50:00Z'),
        activatedAt: new Date('2025-03-15T19:00:00Z'),
      },
    });

    const q3 = await db.queueEntry.create({
      data: {
        eventId: event1.id,
        position: 3,
        name: 'Diana Prince',
        email: 'diana@example.com',
        status: 'WAITING',
      },
    });

    const q4 = await db.queueEntry.create({
      data: {
        eventId: event1.id,
        position: 4,
        name: 'Eve Adams',
        email: 'eve@example.com',
        status: 'WAITING',
      },
    });

    // Seed templates
    await db.template.create({
      data: {
        eventId: event1.id,
        name: 'Gold Frame Classic',
        description: 'Elegant gold frame with event branding',
        frameUrl: '/templates/gold-frame.png',
        overlayUrl: '/templates/gold-overlay.png',
        settings: JSON.stringify({ width: 1920, height: 1080, format: 'PNG' }),
        active: true,
      },
    });

    await db.template.create({
      data: {
        eventId: event1.id,
        name: 'Modern Minimal',
        description: 'Clean minimal design',
        frameUrl: '/templates/minimal-frame.png',
        active: true,
      },
    });

    await db.template.create({
      data: {
        eventId: event3.id,
        name: 'Wedding Rose',
        description: 'Romantic rose-themed frame',
        frameUrl: '/templates/rose-frame.png',
        active: true,
      },
    });

    // Seed gallery
    await db.gallery.create({
      data: {
        eventId: event1.id,
        sessionId: session1.id,
        photoUrl: '/photos/alice-1.jpg',
        thumbnailUrl: '/photos/thumbs/alice-1.jpg',
        caption: 'Alice having fun!',
        isPublic: true,
        isFavorite: true,
      },
    });

    await db.gallery.create({
      data: {
        eventId: event1.id,
        sessionId: session1.id,
        photoUrl: '/photos/alice-2.jpg',
        thumbnailUrl: '/photos/thumbs/alice-2.jpg',
        caption: 'Group shot',
        isPublic: true,
      },
    });

    await db.gallery.create({
      data: {
        eventId: event1.id,
        sessionId: session2.id,
        photoUrl: '/photos/bob-1.jpg',
        caption: 'Bob in the booth',
        isPublic: false,
      },
    });

    // Seed devices
    await db.device.create({
      data: {
        eventId: event1.id,
        name: 'Booth A - Main Hall',
        type: 'PHOTOBOOTH',
        status: 'ONLINE',
        ipAddress: '192.168.1.100',
        firmware: 'v2.1.0',
        lastHeartbeat: new Date(),
      },
    });

    await db.device.create({
      data: {
        eventId: event1.id,
        name: 'Printer Station 1',
        type: 'PRINTER',
        status: 'ONLINE',
        ipAddress: '192.168.1.101',
        firmware: 'v1.5.2',
      },
    });

    await db.device.create({
      data: {
        eventId: event3.id,
        name: 'Kiosk Entry',
        type: 'KIOSK',
        status: 'OFFLINE',
        ipAddress: '192.168.2.50',
      },
    });

    // Seed audit logs
    await db.auditLog.createMany({
      data: [
        { organizationId: org1.id, eventId: event1.id, action: 'CREATE', entityType: 'Event', entityId: event1.id, performedBy: 'admin' },
        { organizationId: org1.id, eventId: event1.id, action: 'UPDATE', entityType: 'Event', entityId: event1.id, details: JSON.stringify({ field: 'status', from: 'DRAFT', to: 'ACTIVE' }), performedBy: 'admin' },
        { organizationId: org1.id, eventId: event1.id, sessionId: session1.id, action: 'CREATE', entityType: 'Session', entityId: session1.id, performedBy: 'system' },
        { organizationId: org1.id, eventId: event1.id, action: 'QUEUE_ADD', entityType: 'QueueEntry', entityId: q3.id, performedBy: 'kiosk' },
        { organizationId: org2.id, eventId: event3.id, action: 'CREATE', entityType: 'Event', entityId: event3.id, performedBy: 'admin' },
      ],
    });

    return successResponse({
      message: 'Database reseeded successfully',
      counts: {
        organizations: 3,
        events: 3,
        sessions: 3,
        queueEntries: 4,
        templates: 3,
        gallery: 3,
        devices: 3,
        auditLogs: 5,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
