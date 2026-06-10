import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { db } from '@/lib/db'

// Keys used in the EmailConfig table
const EMAIL_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'from_name', 'from_email'] as const

// Mask sensitive value (password)
function maskValue(key: string, value: string): string {
  if (key === 'smtp_pass' && value) {
    if (value.length <= 4) return '****'
    return value.substring(0, 2) + '****' + value.substring(value.length - 2)
  }
  return value
}

// GET /api/settings/email — Get current email configuration (masked)
export async function GET() {
  try {
    const configs = await db.emailConfig.findMany()
    const data = configs.map(c => ({
      key: c.key,
      value: maskValue(c.key, c.value),
      isSet: !!c.value,
    }))
    return successResponse(data)
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to get email settings', 500)
  }
}

// POST /api/settings/email — Save email configuration
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext()
    if (!authContext.userId) {
      return errorResponse('Authentication required', 401)
    }

    const body = await request.json()
    const { smtpHost, smtpPort, smtpUser, smtpPass, fromName, fromEmail } = body as {
      smtpHost?: string
      smtpPort?: string | number
      smtpUser?: string
      smtpPass?: string
      fromName?: string
      fromEmail?: string
    }

    // Build a map of key -> value for upserts
    const updates: Record<string, string> = {}
    if (smtpHost !== undefined) updates['smtp_host'] = smtpHost
    if (smtpPort !== undefined) updates['smtp_port'] = String(smtpPort)
    if (smtpUser !== undefined) updates['smtp_user'] = smtpUser
    if (smtpPass !== undefined) updates['smtp_pass'] = smtpPass
    if (fromName !== undefined) updates['from_name'] = fromName
    if (fromEmail !== undefined) updates['from_email'] = fromEmail

    if (Object.keys(updates).length === 0) {
      return errorResponse('No configuration provided', 400)
    }

    // Upsert each key
    for (const [key, value] of Object.entries(updates)) {
      await db.emailConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    return successResponse({ message: 'Email configuration saved' })
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to save email settings', 500)
  }
}

// DELETE /api/settings/email — Clear email configuration
export async function DELETE() {
  try {
    const authContext = await getAuthContext()
    if (!authContext.userId) {
      return errorResponse('Authentication required', 401)
    }

    await db.emailConfig.deleteMany()

    return successResponse({ message: 'Email configuration cleared' })
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to clear email settings', 500)
  }
}
