import { NextRequest } from 'next/server'
import nodemailer from 'nodemailer'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getAuthContext } from '@/lib/auth'

// POST /api/settings/email/test — Send a test email using configured SMTP
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext()
    if (!authContext.userId) {
      return errorResponse('Authentication required', 401)
    }

    const body = await request.json().catch(() => ({}))
    const { testEmail } = body as { testEmail?: string }

    // Load SMTP config from DB
    const configs = await db.emailConfig.findMany()
    const configMap: Record<string, string> = {}
    for (const c of configs) {
      configMap[c.key] = c.value
    }

    const smtpHost = configMap['smtp_host']
    const smtpPort = parseInt(configMap['smtp_port'] || '587', 10)
    const smtpUser = configMap['smtp_user']
    const smtpPass = configMap['smtp_pass']
    const fromName = configMap['from_name'] || 'UMak CSOA Photobooth'
    const fromEmail = configMap['from_email'] || smtpUser

    if (!smtpHost || !smtpUser || !smtpPass) {
      return errorResponse(
        'SMTP is not fully configured. Please provide SMTP Host, User (Gmail address), and Password (App Password).',
        400
      )
    }

    const recipient = testEmail || smtpUser

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Verify connection first
    try {
      await transporter.verify()
    } catch (verifyErr: any) {
      console.error('[Email Test] Connection verification failed:', verifyErr.message)
      return errorResponse(
        `SMTP connection failed: ${verifyErr.message}. Please check your credentials and ensure you're using a Gmail App Password.`,
        400
      )
    }

    // Send test email
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject: 'UMak CSOA Photobooth — Test Email',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: linear-gradient(135deg, #011a14 0%, #064e3b 100%); padding: 24px 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">UMak CSOA Photobooth</h1>
          </div>
          <div style="padding: 24px 32px;">
            <h2 style="color: #064e3b; font-size: 18px; margin: 0 0 12px;">Test Email Successful</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
              If you received this email, your SMTP configuration is working correctly. Photo strip emails will be sent using these settings.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="color: #166534; font-size: 14px; margin: 0;"><strong>SMTP Configuration:</strong></p>
              <ul style="color: #166534; font-size: 13px; margin: 8px 0 0; padding-left: 20px;">
                <li>Host: ${smtpHost}</li>
                <li>Port: ${smtpPort}</li>
                <li>User: ${smtpUser}</li>
                <li>From: ${fromName} &lt;${fromEmail}&gt;</li>
              </ul>
            </div>
          </div>
          <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              UMak CSOA Photobooth Management System
            </p>
          </div>
        </div>
      `,
    })

    return successResponse({
      success: true,
      messageId: info.messageId || 'test-sent',
      message: `Test email sent successfully to ${recipient}`,
    })
  } catch (err: any) {
    console.error('[Email Test] Error:', err)
    return errorResponse(
      err.message || 'Failed to send test email',
      500
    )
  }
}
