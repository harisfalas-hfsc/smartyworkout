import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import type { BrandConfig } from '@/lib/brand'

interface Props {
  name?: string
  subject?: string
  message?: string
  brand?: BrandConfig
}

const Email = ({ name, subject, message, brand }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your message — {brand?.displayName ?? 'Smarty Workout'} support</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandStyle}>{brand?.senderName ?? 'SMARTY WORKOUT'}</Text>
        <Heading style={heading}>We got your message</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'} thanks for reaching out. Our team replies within
          24–48 hours. You can also follow the conversation inside the app under Messages.
        </Text>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Subject</Text>
          <Text style={text}>{subject || 'Support request'}</Text>
          {message ? (
            <>
              <Text style={label}>Your message</Text>
              <Text style={quote}>{message}</Text>
            </>
          ) : null}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Yours in good health,
          <br />
          Haris Falas, BSc Sports Science, EXOS Specialist, CSCS
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `We received your message — ${String(data['brand']?.displayName ?? 'Smarty Workout')}`,
  displayName: 'Contact confirmation',
  previewData: {
    name: 'Alex',
    subject: 'Question about my subscription',
    message: 'Hi, can I pause my plan for a month?',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brandStyle = { fontSize: '12px', letterSpacing: '2px', color: '#2563eb', fontWeight: 700 as const }
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
