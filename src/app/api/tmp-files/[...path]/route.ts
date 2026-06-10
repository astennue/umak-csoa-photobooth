import { NextRequest, NextResponse } from 'next/server'

/**
 * Temp file serving route — LEGACY COMPATIBILITY LAYER
 *
 * On Vercel/serverless, /tmp is ephemeral and not shared across instances.
 * All new uploads go to Supabase Storage, which returns direct public URLs.
 *
 * This route redirects requests to the corresponding Supabase Storage public URL
 * so that any existing references to `/api/tmp-files/...` paths still work.
 */
export async function GET(
  request: NextRequest,
  _props: { params: Promise<{ path: string[] }> }
) {
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

    // Security: reject path traversal attempts
    const relativePath = pathSegments.join('/')
    if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Build the Supabase public URL for this file
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${relativePath}`
      return NextResponse.redirect(publicUrl, 302)
    }

    // No Supabase configured — cannot serve the file
    return NextResponse.json(
      {
        error: 'File not available',
        message: 'Files are stored in Supabase Storage. Please configure NEXT_PUBLIC_SUPABASE_URL to enable file serving.',
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('[Tmp-Files API] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
