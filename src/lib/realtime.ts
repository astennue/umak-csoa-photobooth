/**
 * Real-time broadcast helper for Next.js API routes.
 * Sends events to the WebSocket mini-service which then broadcasts to all connected clients.
 */

const REALTIME_SERVICE_URL = 'http://localhost:3003'
const API_TOKEN = 'csoa-realtime-internal-2025'

interface BroadcastPayload {
  event: string
  payload: any
  room?: string // Optional: target a specific room like "event:abc123"
}

/**
 * Broadcast a real-time event through the WebSocket service.
 * Call this from Next.js API routes after database mutations.
 */
export async function broadcastEvent(event: string, payload: any, room?: string): Promise<void> {
  try {
    const response = await fetch(`${REALTIME_SERVICE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ event, payload, room }),
    })

    if (!response.ok) {
      console.error(`[Broadcast] Failed to broadcast "${event}": ${response.status}`)
    }
  } catch (error) {
    // Don't throw - real-time is non-critical, the DB mutation already succeeded
    console.error(`[Broadcast] Error broadcasting "${event}":`, error)
  }
}

// ─── Predefined Event Helpers ──────────────────────────────────────────────

export async function broadcastSessionActivated(sessionId: string, eventId: string, guestName: string) {
  await broadcastEvent('session:activated', { sessionId, eventId, guestName }, `event:${eventId}`)
  await broadcastEvent('session:activated', { sessionId, eventId, guestName }, 'live-display')
  // Also broadcast globally for sidebar indicator
  await broadcastEvent('session:update', { sessionId, eventId, guestName, status: 'IN_PROGRESS' })
}

export async function broadcastSessionDeactivated(sessionId: string, eventId: string, guestName: string, status: string = 'COMPLETED') {
  await broadcastEvent('session:deactivated', { sessionId, eventId, guestName, status }, `event:${eventId}`)
  await broadcastEvent('session:deactivated', { sessionId, eventId, guestName, status }, 'live-display')
  await broadcastEvent('session:update', { sessionId, eventId, guestName, status })
}

export async function broadcastSessionUpdated(sessionId: string, eventId: string, data: any) {
  await broadcastEvent('session:updated', { sessionId, eventId, ...data }, `event:${eventId}`)
  await broadcastEvent('session:updated', { sessionId, eventId, ...data }, 'live-display')
}

export async function broadcastQueueUpdated(eventId: string, data: any) {
  await broadcastEvent('queue:updated', { eventId, ...data }, `event:${eventId}`)
  await broadcastEvent('queue:updated', { eventId, ...data }, 'live-display')
}

export async function broadcastQueueEntryUpdate(eventId: string, entryId: string, status: string, name: string) {
  await broadcastEvent('queue:entry', { eventId, entryId, status, name }, `event:${eventId}`)
  await broadcastEvent('queue:entry', { eventId, entryId, status, name }, 'live-display')
}
