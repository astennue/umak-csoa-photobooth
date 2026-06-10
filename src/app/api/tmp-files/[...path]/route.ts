import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, statSync, existsSync } from 'fs'
import path from 'path'

const TMP_DIR = path.join('/tmp', 'photobooth-uploads')

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const prefix = '/api/tmp-files/'
    const urlPath = url.pathname.startsWith(prefix)
      ? url.pathname.slice(prefix.length)
      : ''
    const pathSegments = urlPath.split('/').filter(Boolean)

    if (pathSegments.length === 0) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const relativePath = pathSegments.join('/')

    // Security: reject path traversal attempts
    if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const filePath = path.join(TMP_DIR, relativePath)

    // Security: ensure within /tmp/photobooth-uploads
    const resolvedPath = path.resolve(filePath)
    const resolvedDir = path.resolve(TMP_DIR)
    if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    try {
      const fileStat = statSync(filePath)
      if (!fileStat.isFile()) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 })
      }
    } catch {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const fileBuffer = readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[Tmp-Files API] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
