import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Item {
  number?: number
  label?: string
  status?: string
  detail?: string
}

interface Props {
  startedAt?: string
  finishedAt?: string
  durationSec?: number
  trigger?: string
  summary?: string
  passed?: number
  warned?: number
  failed?: number
  total?: number
  items?: Item[]
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

const badge = (status?: string) =>
  status === 'pass' ? 'PASS' : status === 'warn' ? 'WARNING' : 'FAILED'

const badgeColor = (status?: string) =>
  status === 'pass' ? '#059669' : status === 'warn' ? '#d97706' : '#dc2626'

const Email = ({
  startedAt,
  finishedAt,
  durationSec,
  trigger,
  summary,
  failed = 0,
  items = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`System health — ${summary || 'nightly report'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT — SYSTEM HEALTH</Text>
        <Heading style={heading}>
          {failed > 0 ? 'Problems found' : 'All systems healthy'}
        </Heading>

        <Text style={{ ...text, fontWeight: 700, color: failed > 0 ? '#dc2626' : '#059669' }}>
          {summary || '—'}
        </Text>

        <Text style={label}>Run</Text>
        <Text style={text}>
          {fmt(startedAt)} → {fmt(finishedAt)} ({durationSec ?? 0}s) ·{' '}
          {trigger === 'manual' ? 'run manually from the Admin panel' : 'nightly scheduled run'} ·
          Cyprus time
        </Text>

        <Hr style={hr} />
        <Text style={label}>Checks</Text>
        {items.map((it, i) => (
          <Text key={i} style={row}>
            <span style={{ fontWeight: 700 }}>
              {it.number ?? i + 1}. {it.label}
            </span>
            <br />
            <span style={{ color: badgeColor(it.status), fontWeight: 700 }}>
              {badge(it.status)}
            </span>{' '}
            — {it.detail}
          </Text>
        ))}

        <Hr style={hr} />
        <Text style={footer}>
          Change the time, the recipient or which checks run in the Admin panel → Cron jobs.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    Number(data['failed'] ?? 0) > 0
      ? `[Health] ${data['failed']} FAILURE(S) — ${data['passed'] ?? 0}/${data['total'] ?? 0} checks passed`
      : Number(data['warned'] ?? 0) > 0
        ? `[Health] All critical checks passed — ${data['warned']} warning(s)`
        : `[Health] All ${data['total'] ?? 0} checks passed`,
  displayName: 'Nightly system health report',
  to: 'smartyworkout@outlook.com',
  previewData: {
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 12,
    trigger: 'schedule',
    summary: '14 of 15 checks passed, 1 failure.',
    passed: 14,
    warned: 0,
    failed: 1,
    total: 15,
    items: [
      { number: 1, label: 'Database reachable', status: 'pass', detail: 'Database answered normally.' },
      {
        number: 2,
        label: 'AI credits / workout generation',
        status: 'fail',
        detail: 'OUT OF AI CREDITS — members cannot generate workouts.',
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '640px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#2563eb', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937' }
const label = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  color: '#6b7280',
  margin: '16px 0 4px',
}
const row = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1f2937',
  borderLeft: '3px solid #2563eb',
  padding: '6px 0 6px 12px',
  margin: '0 0 8px',
}
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280' }

export default Email
