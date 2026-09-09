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
  name?: string
  email?: string
  subject?: string
  message?: string
}

const Email = ({ name, email, subject, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact message on Smarty Workout</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT — SUPPORT</Text>
        <Heading style={heading}>New contact message</Heading>
        <Text style={label}>From</Text>
        <Text style={text}>
          {name || 'Unknown'} &lt;{email || 'unknown'}&gt;
        </Text>
        <Text style={label}>Subject</Text>
        <Text style={text}>{subject || 'Support request'}</Text>
        <Text style={label}>Message</Text>
        <Text style={quote}>{message || '(empty)'}</Text>
        <Hr style={hr} />
        <Text style={footer}>Reply from Admin → Messages, or hit reply to answer by email.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `New contact message: ${String(data['subject'] || 'Support request')}`,
  displayName: 'Contact notification (admin)',
  to: 'smartyworkout@outlook.com',
  previewData: {
    name: 'Alex',
    email: 'alex@example.com',
    subject: 'Question about my subscription',
    message: 'Hi, can I pause my plan for a month?',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#2563eb', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937' }
const label = { fontSize: '12px', textTransform: 'uppercase' as const, color: '#6b7280', margin: '16px 0 4px' }
const quote = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#1f2937',
  borderLeft: '3px solid #2563eb',
  padding: '4px 0 4px 12px',
  whiteSpace: 'pre-wrap' as const,
}
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280' }

export default Email
