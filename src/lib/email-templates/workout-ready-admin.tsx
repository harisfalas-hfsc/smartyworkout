import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  userName?: string
  userEmail?: string
  userId?: string
  sessionId?: string
  stage?: string
  workoutName?: string
  workoutId?: string
  attempts?: number
}

const Email = ({ userName, userEmail, userId, sessionId, stage, workoutName, workoutId, attempts }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A previously failed workout has been delivered</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT — RECOVERED</Text>
        <Heading style={heading}>Workout delivered after a failure</Heading>
        <Text style={label}>Member</Text>
        <Text style={text}>{`${userName || 'Unknown'} <${userEmail || 'no email'}>`}</Text>
        <Text style={label}>User id</Text>
        <Text style={text}>{userId || '—'}</Text>
        <Text style={label}>Session id</Text>
        <Text style={text}>{sessionId || '—'}</Text>
        <Text style={label}>Stage</Text>
        <Text style={text}>{stage || 'initial generation'}</Text>
        <Text style={label}>Workout</Text>
        <Text style={text}>{`${workoutName || 'Session'} (${workoutId || '—'})`}</Text>
        <Text style={label}>Attempts</Text>
        <Text style={text}>{String(attempts ?? 1)}</Text>
        <Hr style={hr} />
        <Text style={footer}>The member has been emailed and the workout is in their account.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[SmartyWorkout] Recovered — workout delivered to ${String(data['userEmail'] || 'member')}`,
  displayName: 'Workout ready (admin)',
  previewData: {
    userName: 'Alex Doe',
    userEmail: 'alex@example.com',
    sessionId: '11111111-1111-1111-1111-111111111111',
    stage: 'initial generation',
    workoutName: 'Full Body Strength Builder',
    attempts: 3,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#16a34a', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937', margin: '0' }
const label = { fontSize: '12px', textTransform: 'uppercase' as const, color: '#6b7280', margin: '14px 0 2px' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280' }

export default Email
