import type { ComponentType } from 'react'
import { template as adminAlert } from './admin-alert'
import { template as cronReport } from './cron-report'
import { template as blogPublished } from './blog-published'
import { template as healthReport } from './health-report'
import { template as errorAlert } from './error-alert'
import { template as contactConfirmation } from './contact-confirmation'
import { template as contactNotification } from './contact-notification'
import { template as supportReply } from './support-reply'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'admin-alert': adminAlert,
  'contact-confirmation': contactConfirmation,
  'cron-report': cronReport,
  'blog-published': blogPublished,
  'health-report': healthReport,
  'error-alert': errorAlert,
  'contact-notification': contactNotification,
  'support-reply': supportReply,
}
