import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const PORT = 3003

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://21.0.10.51:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// ─── REST API for broadcasting events from Next.js API routes ────────────────

// Simple auth token for API calls from Next.js
const API_TOKEN = 'csoa-realtime-internal-2025'

// Parse JSON body from request
function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: string) => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

// Handle API requests from Next.js backend
const handler = async (req: any, res: any) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  // Verify auth token
  const authHeader = req.headers['authorization']
  const token = authHeader?.replace('Bearer ', '')
  if (token !== API_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  try {
    const data = await parseBody(req)
    const { event, payload, room } = data

    if (!event) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Event name is required' }))
      return
    }

    // Broadcast to specific room or all
    if (room) {
      io.to(room).emit(event, payload)
    } else {
      io.emit(event, payload)
    }

    console.log(`[Realtime] Broadcast "${event}"${room ? ` to room "${room}"` : ' to all'}`)

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, event, room: room || 'all' }))
  } catch (err) {
    console.error('[Realtime] Error processing request:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}

// ─── Socket.io Connection Handling ──────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Realtime] Client connected: ${socket.id}`)

  // Join event-specific rooms for targeted updates
  socket.on('join-event', (eventId: string) => {
    socket.join(`event:${eventId}`)
    console.log(`[Realtime] Client ${socket.id} joined event:${eventId}`)
  })

  // Leave event-specific rooms
  socket.on('leave-event', (eventId: string) => {
    socket.leave(`event:${eventId}`)
    console.log(`[Realtime] Client ${socket.id} left event:${eventId}`)
  })

  // Join live-display room for client-facing displays
  socket.on('join-live', () => {
    socket.join('live-display')
    console.log(`[Realtime] Client ${socket.id} joined live-display`)
  })

  socket.on('disconnect', (reason) => {
    console.log(`[Realtime] Client disconnected: ${socket.id} (${reason})`)
  })
})

// ─── Start Server ────────────────────────────────────────────────────────────

httpServer.on('request', handler)

httpServer.listen(PORT, () => {
  console.log(`[Realtime] Socket.io server running on port ${PORT}`)
  console.log(`[Realtime] REST API for broadcasting at http://localhost:${PORT}`)
})
