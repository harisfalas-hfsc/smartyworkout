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
  subject?: string
  message?: string
}

const Email = ({ name, subject, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Smarty Workout support replied to your message</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT</Text>
        <Heading style={heading}>We replied to your message</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'} here is our reply
          {subject ? ` about “${subject}”` : ''}:
        </Text>
        <Text style={quote}>{message || '(empty)'}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          You can continue the conversation in the app under Messages.
          <br />
          <br />
          Yours in good health,
          <br />
          Haris Falas, BSc Sports Science, Exo Specialist, CSCS
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data['subject'] ? `Re: ${String(data['subject'])}` : 'Smarty Workout support replied',
  displayName: 'Support reply',
  previewData: {
    name: 'Alex',
    subject: 'Question about my subscription',
    message: 'Sure — you can pause your plan any time from Settings.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#2563eb', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937' }
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
