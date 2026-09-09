import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
}

const Email = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your workout is on its way — nothing for you to do</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT</Text>
        <Heading style={heading}>Your workout is on its way</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>
          We hit a temporary snag building your workout. Your payment and your answers are safe, we are
          already on it, and you will get your workout shortly — nothing for you to do.
        </Text>
        <Text style={text}>
          We will email you the moment it is ready, and it will appear in your logbook automatically.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Haris Falas — BSc Sports Science, EXOS Specialist, CSCS</Text>
        <Text style={footer}>Smarty Workout</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your workout is on its way',
  displayName: 'Workout delay (member)',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#2563eb', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280', margin: '0' }

export default Email
