import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  urgent?: boolean
  userName?: string
  userEmail?: string
  userId?: string
  sessionId?: string
  questionnaireId?: string
  stage?: string
  paymentState?: string
  failureKind?: string
  reason?: string
  refinementText?: string
  attempt?: number
  occurredAt?: string
}

const Email = ({
  urgent,
  userName,
  userEmail,
  userId,
  sessionId,
  questionnaireId,
  stage,
  paymentState,
  failureKind,
  reason,
  refinementText,
  attempt,
  occurredAt,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{urgent ? 'A member is still waiting for a workout' : 'A workout generation failed'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT — {urgent ? 'URGENT' : 'ALERT'}</Text>
        <Heading style={heading}>
          {urgent ? 'A member is still without their workout' : 'Workout generation failed'}
        </Heading>
        <Row label="Member" value={`${userName || 'Unknown'} <${userEmail || 'no email'}>`} />
        <Row label="User id" value={userId} />
        <Row label="Session id" value={sessionId} />
        <Row label="Preferences id" value={questionnaireId} />
        <Row label="Stage" value={stage} />
        <Row label="Payment state" value={paymentState} />
        <Row label="Failure kind" value={failureKind} />
        <Row label="Attempt" value={attempt ? String(attempt) : '1'} />
        <Row label="When" value={occurredAt} />
        {refinementText ? <Row label="Refinement text" value={refinementText} /> : null}
        <Text style={label}>Reason</Text>
        <Text style={quote}>{reason || '(no reason captured)'}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          The member has been told we are on it. Retries run automatically every few minutes; open the
          Admin panel → Generation failures to see the live state.
        </Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label: l, value }: { label: string; value?: string }) =>
  value ? (
    <>
      <Text style={label}>{l}</Text>
      <Text style={text}>{value}</Text>
    </>
  ) : null

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data['urgent']
      ? `[SmartyWorkout URGENT] Workout still not delivered — ${String(data['userEmail'] || 'member')}`
      : `[SmartyWorkout ALERT] Workout generation failed — ${String(data['userEmail'] || 'member')}`,
  displayName: 'Workout generation failure (admin)',
  previewData: {
    userName: 'Alex Doe',
    userEmail: 'alex@example.com',
    userId: '00000000-0000-0000-0000-000000000000',
    sessionId: '11111111-1111-1111-1111-111111111111',
    stage: 'initial generation',
    paymentState: 'active subscription',
    failureKind: 'ai_balance',
    reason: '402 Payment Required — AI balance exhausted',
    attempt: 2,
    occurredAt: '2026-01-01 09:14 UTC',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#b91c1c', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937', margin: '0' }
const label = { fontSize: '12px', textTransform: 'uppercase' as const, color: '#6b7280', margin: '14px 0 2px' }
const quote = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#1f2937',
  borderLeft: '3px solid #b91c1c',
  padding: '4px 0 4px 12px',
  whiteSpace: 'pre-wrap' as const,
}
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280' }

export default Email
