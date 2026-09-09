import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  message?: string
  source?: string
  route?: string | null
  severity?: string
  kind?: string
  occurredAt?: string
  userEmail?: string
  userId?: string | null
  details?: string
  groupWindowMin?: number
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
      second: '2-digit',
      timeZone: 'Europe/Athens',
    })
  } catch {
    return iso
  }
}

const Email = ({
  message,
  source,
  route,
  severity,
  kind,
  occurredAt,
  userEmail,
  userId,
  details,
  groupWindowMin = 30,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Problem: ${message || 'unknown error'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT — PROBLEM DETECTED</Text>
        <Heading style={heading}>{message || 'Unknown error'}</Heading>

        <Text style={label}>What happened</Text>
        <Text style={quote}>{message || '—'}</Text>

        <Text style={label}>Where</Text>
        <Text style={text}>
          {source || 'unknown'}
          {route ? ` · ${route}` : ''} · {kind === 'client' ? 'in the app (member device)' : 'on the server'}
        </Text>

        <Text style={label}>When (Cyprus time)</Text>
        <Text style={text}>{fmt(occurredAt)}</Text>

        <Text style={label}>Member affected</Text>
        <Text style={text}>
          {userEmail || 'unknown'}
          {userId ? ` (${userId})` : ''}
        </Text>

        <Text style={label}>Severity</Text>
        <Text style={text}>{severity === 'warning' ? 'Warning' : 'Error'}</Text>

        {details && details !== '{}' ? (
          <>
            <Text style={label}>Technical details</Text>
            <Text style={fail}>{details}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          The same problem will not email again for {groupWindowMin} minutes — repeats are counted
          instead. Full list and settings: Admin panel → Cron jobs.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[Problem] ${String(data['source'] || 'app')} — ${String(data['message'] || 'error').slice(0, 80)}`,
  displayName: 'Instant problem alert',
  to: 'smartyworkout@outlook.com',
  previewData: {
    message: 'Workout generation failed: out of AI credits',
    source: 'workout-generation',
    route: '/coach',
    severity: 'error',
    kind: 'server',
    occurredAt: new Date().toISOString(),
    userEmail: 'member@example.com',
    userId: '00000000-0000-0000-0000-000000000000',
    details: '{\n  "status": 402\n}',
    groupWindowMin: 30,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '600px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#dc2626', fontWeight: 700 as const }
const heading = { fontSize: '20px', color: '#0b1220', margin: '8px 0 12px' }
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
  borderLeft: '3px solid #dc2626',
  padding: '4px 0 4px 12px',
  whiteSpace: 'pre-wrap' as const,
}
const fail = { ...quote, borderLeft: '3px solid #6b7280' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280' }

export default Email
