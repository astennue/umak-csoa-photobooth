import { NextRequest, NextResponse } from 'next/server'

/**
 * Template file serving route — LEGACY COMPATIBILITY LAYER
 *
 * On Vercel/serverless, the local `uploads/templates/` directory is read-only and ephemeral.
 * All new template uploads go to Supabase Storage, which returns direct public URLs.
 *
 * This route redirects requests to the corresponding Supabase Storage public URL
 * so that any existing database records referencing `/api/files-templates?f=...` paths still work.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const filename = url.searchParams.get('f')

    if (!filename) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 })
    }

    // Security: reject path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Build the Supabase public URL for this file
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/uploads/templates/${filename}`
      return NextResponse.redirect(publicUrl, 302)
    }

    // No Supabase configured — cannot serve the file
    return NextResponse.json(
      {
        error: 'File not available',
        message: 'Template files are stored in Supabase Storage. Please configure NEXT_PUBLIC_SUPABASE_URL to enable file serving.',
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('[Files-Templates API] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
