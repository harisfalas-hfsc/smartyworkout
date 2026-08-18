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
  alertType?: string
  title?: string
  details?: string
  link?: string
}

const Email = ({ alertType, title, details, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New item waiting in the Smarty Workout admin panel</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT — ADMIN</Text>
        <Heading style={heading}>{title || 'New admin item'}</Heading>
        <Text style={label}>Type</Text>
        <Text style={text}>{alertType || 'notification'}</Text>
        <Text style={label}>Details</Text>
        <Text style={quote}>{details || '(no details)'}</Text>
        {link ? (
          <>
            <Text style={label}>Open</Text>
            <Text style={text}>{link}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>Sign in and open the Admin panel to review and action this item.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[Admin] ${String(data['title'] || 'New item in the admin panel')}`,
  displayName: 'Admin alert',
  to: 'smartyworkout@outlook.com',
  previewData: {
    alertType: 'Community report',
    title: 'New content report',
    details: 'A member reported a shared workout for inappropriate content.',
    link: 'https://smartyworkout.com/admin',
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
