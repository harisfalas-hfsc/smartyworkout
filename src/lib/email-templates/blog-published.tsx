import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  title?: string
  excerpt?: string
  url?: string
  slug?: string
  readTime?: string
  trigger?: string
  publishedAt?: string
  notified?: number
  totalArticles?: number
}

const fmt = (iso?: string) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Athens',
    })
  } catch {
    return iso
  }
}

const Email = ({
  title,
  excerpt,
  url,
  readTime,
  trigger,
  publishedAt,
  notified = 0,
  totalArticles = 0,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New article published — ${title || 'Fitness article'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT — BLOG</Text>
        <Heading style={heading}>New article published</Heading>

        <Text style={label}>Title</Text>
        <Text style={text}>{title || '—'}</Text>

        <Text style={label}>What it is about</Text>
        <Text style={quote}>{excerpt || '—'}</Text>

        <Text style={label}>Details</Text>
        <Text style={text}>
          Fitness · {readTime || '—'} · published {fmt(publishedAt)} (
          {trigger === 'manual' ? 'run manually from the Admin panel' : 'scheduled weekly run'})
        </Text>

        <Text style={label}>Members notified</Text>
        <Text style={text}>
          {notified} member{notified === 1 ? '' : 's'} received an inbox notification with the link ·{' '}
          {totalArticles} articles on the blog in total
        </Text>

        {url ? (
          <Button style={button} href={url}>
            Read the article
          </Button>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          Manage the weekly article schedule, switch and topics in the Admin panel → Cron jobs.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[Blog] Published — ${String(data['title'] || 'new Fitness article')}`,
  displayName: 'Blog article published',
  previewData: {
    title: 'Restarting Fitness: Your Smart Comeback Guide',
    excerpt: 'How to return to training after a long break without wrecking your first week.',
    url: 'https://smartyworkout.com/blog/restarting-fitness-your-smart-comeback-guide',
    readTime: '6 min read',
    trigger: 'schedule',
    publishedAt: new Date().toISOString(),
    notified: 128,
    totalArticles: 40,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '600px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#2563eb', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937' }
const label = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  color: '#6b7280',
  margin: '16px 0 4px',
}
const quote = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1f2937',
  borderLeft: '3px solid #2563eb',
  padding: '4px 0 4px 12px',
  whiteSpace: 'pre-wrap' as const,
}
const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 700 as const,
  borderRadius: '12px',
  padding: '12px 20px',
  margin: '20px 0 0',
  display: 'inline-block',
}
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280' }

export default Email
