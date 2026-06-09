import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

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
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params

    // Build the requested file path from segments
    const relativePath = pathSegments.join('/')

    // Security: reject path traversal attempts
    if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Construct the full file path
    const filePath = path.join(UPLOADS_DIR, relativePath)

    // Security: ensure the resolved path is within the uploads directory
    const resolvedPath = path.resolve(filePath)
    const resolvedUploadsDir = path.resolve(UPLOADS_DIR)
    if (!resolvedPath.startsWith(resolvedUploadsDir + path.sep) && resolvedPath !== resolvedUploadsDir) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Verify it's a file, not a directory
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    // Read and return the file
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[Files API] Error serving file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
