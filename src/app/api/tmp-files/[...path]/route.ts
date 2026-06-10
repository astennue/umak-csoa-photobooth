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
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
}

export async function GET(
  request: NextRequest,
  _props: { params: Promise<{ path: string[] }> }
) {
  try {
    // CRITICAL: Do NOT await _props.params - it hangs in Next.js 16 catch-all routes.
    // Extract path from URL instead.
    const url = new URL(request.url)
    const prefix = '/api/tmp-files/'
    const urlPath = url.pathname.startsWith(prefix)
      ? url.pathname.slice(prefix.length)
      : ''
    const pathSegments = urlPath.split('/').filter(Boolean)

    if (pathSegments.length === 0) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    // Build the requested file path from segments
    const relativePath = pathSegments.join('/')

    // Security: reject path traversal attempts
    if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Construct the full file path under /tmp/photobooth-uploads
    const filePath = path.join(TMP_DIR, relativePath)

    // Security: ensure the resolved path is within the /tmp/photobooth-uploads directory
    const resolvedPath = path.resolve(filePath)
    const resolvedTmpDir = path.resolve(TMP_DIR)
    if (!resolvedPath.startsWith(resolvedTmpDir + path.sep) && resolvedPath !== resolvedTmpDir) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists and is a file
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

    // Determine content type from extension
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    // Read the file synchronously to avoid async issues
    const fileBuffer = readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        // Shorter cache for /tmp files since they're ephemeral
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[Tmp-Files API] Error serving file:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
