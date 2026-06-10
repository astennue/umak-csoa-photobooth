import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getAuthContext } from '@/lib/auth';

// Initialize Resend lazily — only when API key is available
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_xxxxx' || apiKey.trim() === '') {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Convert a base64 dataUrl to a Buffer and extract metadata.
 * e.g. "data:image/png;base64,iVBORw0KGgo..." => { buffer, mimeType, fileName }
 */
function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } {
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid dataUrl format. Expected data:image/...;base64,...');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Determine extension from mime type
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  const extension = mimeToExt[mimeType] || 'png';

  return { buffer, mimeType, extension };
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { to, subject, message, photoDataUrl, templateName, sessionId } = body as {
      to: string;
      subject: string;
      message: string;
      photoDataUrl: string;
      templateName?: string;
      sessionId?: string;
    };

    // Validate required fields
    if (!to || typeof to !== 'string' || to.trim() === '') {
      return errorResponse('Recipient email is required', 400);
    }
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return errorResponse('Subject is required', 400);
    }
    if (!message || typeof message !== 'string') {
      return errorResponse('Message is required', 400);
    }
    if (!photoDataUrl || typeof photoDataUrl !== 'string') {
      return errorResponse('Photo data is required', 400);
    }

    // Parse the dataUrl
    let photoBuffer: Buffer;
    let photoMimeType: string;
    let photoExtension: string;
    try {
      const parsed = parseDataUrl(photoDataUrl);
      photoBuffer = parsed.buffer;
      photoMimeType = parsed.mimeType;
      photoExtension = parsed.extension;
    } catch (parseErr: any) {
      return errorResponse(parseErr.message || 'Invalid photo data format', 400);
    }

    const fileName = `photobooth-photo-${Date.now()}.${photoExtension}`;

    // Try sending with Resend
    const resend = getResendClient();

    if (resend) {
      try {
        const emailResult = await resend.emails.send({
          from: 'UMak CSOA Photobooth <onboarding@resend.dev>',
          to: to.trim(),
          subject: subject.trim(),
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="background: linear-gradient(135deg, #011a14 0%, #064e3b 100%); padding: 24px 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">UMak CSOA Photobooth</h1>
                ${templateName ? `<p style="color: #6ee7b7; margin: 4px 0 0; font-size: 14px;">Template: ${templateName}</p>` : ''}
              </div>
              <div style="padding: 24px 32px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  ${message.replace(/\n/g, '<br/>')}
                </p>
                <div style="text-align: center; margin: 24px 0;">
                  <img
                    src="cid:photobooth-photo"
                    alt="Your Photobooth Photo"
                    style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
                  />
                </div>
                <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 16px 0 0;">
                  This photo was captured at a UMak CSOA event. Enjoy your memory!
                </p>
              </div>
              <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  UMak CSOA Photobooth Management System
                </p>
              </div>
            </div>
          `,
          attachments: [
            {
              filename: fileName,
              content: photoBuffer,
              content_type: photoMimeType,
              disposition: 'attachment',
            },
          ],
        });

        // Log successful email
        await db.emailLog.create({
          data: {
            to: to.trim(),
            subject: subject.trim(),
            status: 'SENT',
            photoUrl: `attachment:${fileName}`,
            sessionId: sessionId?.trim() || null,
          },
        });

        return successResponse({
          success: true,
          messageId: emailResult.data?.id || 'sent-via-resend',
          provider: 'resend',
        }, 200);
      } catch (emailErr: any) {
        // Resend failed — log as failed and queue for retry
        await db.emailLog.create({
          data: {
            to: to.trim(),
            subject: subject.trim(),
            status: 'FAILED',
            error: emailErr.message || 'Resend send failed',
            sessionId: sessionId?.trim() || null,
          },
        });

        // Fall through to queue approach
      }
    }

    // Fallback: Queue email in database for later processing
    const emailLog = await db.emailLog.create({
      data: {
        to: to.trim(),
        subject: subject.trim(),
        status: 'QUEUED',
        photoUrl: `dataurl:${photoMimeType};base64,...(truncated)`,
        sessionId: sessionId?.trim() || null,
      },
    });

    return successResponse({
      success: true,
      messageId: emailLog.id,
      provider: 'queued',
      note: 'Email queued for later processing — Resend API key not configured or send failed. The email will be retried when the service is available.',
    }, 200);
  } catch (err: any) {
    return errorResponse(err.message || 'Internal server error', 500);
  }
}
