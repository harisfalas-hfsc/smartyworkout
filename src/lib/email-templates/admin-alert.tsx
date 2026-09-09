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
import type { BrandConfig } from '@/lib/brand'

interface Props {
  alertType?: string
  title?: string
  details?: string
  link?: string
  brand?: BrandConfig
}

const Email = ({ alertType, title, details, link, brand }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New item waiting in the {brand?.displayName ?? 'Smarty Workout'} admin panel</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandStyle}>{brand?.senderName ?? 'SMARTY WORKOUT'} — ADMIN</Text>
        <Heading style={heading}>{title || 'New admin item'}</Heading>
        <Text style={label}>What this is about</Text>
        <Text style={text}>{alertType || 'Your app'}</Text>
        <Text style={label}>What happened</Text>
        <Text style={quote}>{details || 'No further details.'}</Text>
        {link ? (
          <>
            <Text style={label}>Where to look</Text>
            <Text style={text}>{link}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>This is an automatic message from your own {brand?.displayName ?? 'Smarty Workout'} app, sent only to you as the owner. Members never see it.</Text>
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
