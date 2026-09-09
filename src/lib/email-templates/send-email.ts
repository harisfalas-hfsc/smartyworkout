import * as React from 'react'
import { render } from '@react-email/render'
import { EmailAPIError, sendLovableEmail } from '@lovable.dev/email-js'
import { TEMPLATES } from './registry'
import { BRANDS, type BrandId } from '@/lib/brand'

// Server-only: reads LOVABLE_API_KEY. Never import from client components.

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string
  replyTo?: string
  /** Brand to use for sender name, domain and system email address. */
  brandId?: BrandId
}

/**
 * Renders a registered template and sends it through Lovable's managed email
 * API. Suppression, retries, and rate limits are enforced by Lovable
 * server-side. A suppressed recipient is an expected outcome
 * ({ sent: false }); any other failure throws — EmailAPIError exposes
 * .code and .status for branching.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const apiKey = process.env['LOVABLE_API_KEY']
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY is not configured')
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  const brand = options.brandId ? (BRANDS[options.brandId] ?? BRANDS.smartyworkout) : BRANDS.smartyworkout

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address. When the fixed address is the legacy system
  // inbox, switch it to the active brand's system email.
  let recipient = template.to || to
  if (recipient === 'smartyworkout@outlook.com') {
    recipient = brand.systemEmail
  }
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = { ...(options.templateData ?? {}), brand }
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  try {
    await sendLovableEmail(
      {
        to: recipient,
        from: `${brand.senderName} <noreply@${brand.fromDomain}>`,
        sender_domain: brand.senderDomain,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: options.idempotencyKey || crypto.randomUUID(),
        reply_to: options.replyTo,
      },
      { apiKey, sendUrl: process.env['LOVABLE_SEND_URL'] }
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      return { sent: false, reason: 'recipient_suppressed' }
    }
    throw error
  }

  return { sent: true }
}
