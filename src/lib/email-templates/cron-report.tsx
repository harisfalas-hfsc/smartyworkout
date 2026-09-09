import React from 'react'
import {
  Body,
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
  jobLabel?: string
  status?: string
  trigger?: string
  startedAt?: string
  finishedAt?: string
  durationSec?: number
  summary?: string
  added?: string[]
  addedCount?: number
  total?: number
  exercises?: number
  workouts?: number
  articles?: number
  failures?: string[]
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
  jobLabel,
  status,
  trigger,
  startedAt,
  finishedAt,
  durationSec,
  summary,
  added = [],
  addedCount = 0,
  total = 0,
  exercises = 0,
  workouts = 0,
  articles = 0,
  failures = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${jobLabel || 'Scheduled job'} — ${status || 'finished'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT — SCHEDULED JOB</Text>
        <Heading style={heading}>{jobLabel || 'Scheduled job'}</Heading>

        <Text style={label}>Result</Text>
        <Text style={text}>
          {status === 'ok' ? 'Completed successfully' : status === 'skipped' ? 'Skipped — nothing to update' : 'Failed'}
          {trigger ? ` (${trigger === 'manual' ? 'run manually from the Admin panel' : 'scheduled run'})` : ''}
        </Text>

        <Text style={label}>Started / finished</Text>
        <Text style={text}>
          {fmt(startedAt)} → {fmt(finishedAt)} ({durationSec ?? 0}s)
        </Text>

        <Text style={label}>What was done</Text>
        <Text style={quote}>{summary || '—'}</Text>

        <Text style={label}>Index</Text>
        <Text style={text}>
          {total} keywords indexed · {addedCount} new this run · {exercises} exercises · {workouts} workouts · {articles} blog articles
        </Text>

        {added.length ? (
          <>
            <Text style={label}>New keywords</Text>
            <Text style={quote}>{added.join(', ')}</Text>
          </>
        ) : null}

        {failures.length ? (
          <>
            <Text style={label}>Failures</Text>
            <Text style={fail}>{failures.join('\n')}</Text>
          </>
        ) : (
          <>
            <Text style={label}>Failures</Text>
            <Text style={text}>None.</Text>
          </>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Manage schedules, switches and content in the Admin panel → Cron jobs.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[Cron] ${String(data['jobLabel'] || 'Scheduled job')} — ${
      data['status'] === 'ok'
        ? `${data['addedCount'] ?? 0} new keywords`
        : data['status'] === 'skipped'
          ? 'nothing to update'
          : 'failed'
    }`,
  displayName: 'Scheduled job report',
  to: 'smartyworkout@outlook.com',
  previewData: {
    jobLabel: 'Automatic SEO update',
    status: 'ok',
    trigger: 'schedule',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: 6,
    summary: 'SEO index updated — 12 new keywords, 1840 indexed in total.',
    added: ['kettlebell swing', 'tabata intervals', 'glute bridge'],
    addedCount: 3,
    total: 1840,
    exercises: 1312,
    workouts: 428,
    articles: 14,
    failures: [],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '600px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#2563eb', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937' }
const label = { fontSize: '12px', textTransform: 'uppercase' as const, color: '#6b7280', margin: '16px 0 4px' }
const quote = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1f2937',
  borderLeft: '3px solid #2563eb',
  padding: '4px 0 4px 12px',
  whiteSpace: 'pre-wrap' as const,
}
const fail = { ...quote, borderLeft: '3px solid #dc2626' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280' }

export default Email
