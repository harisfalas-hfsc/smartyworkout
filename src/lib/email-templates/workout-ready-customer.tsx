import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  workoutName?: string
  workoutUrl?: string
}

const Email = ({ name, workoutName, workoutUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your workout is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SMARTY WORKOUT</Text>
        <Heading style={heading}>Your workout is ready</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi,'}</Text>
        <Text style={text}>
          Thank you for your patience — {workoutName ? `“${workoutName}”` : 'your session'} is built and
          waiting for you.
        </Text>
        {workoutUrl ? (
          <Button href={workoutUrl} style={button}>
            Open my workout
          </Button>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>Haris Falas — BSc Sports Science, EXOS Specialist, CSCS</Text>
        <Text style={footer}>Smarty Workout</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your workout is ready',
  displayName: 'Workout ready (member)',
  previewData: {
    name: 'Alex',
    workoutName: 'Full Body Strength Builder',
    workoutUrl: 'https://smartyworkout.com/logbook',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '12px', letterSpacing: '2px', color: '#2563eb', fontWeight: 700 as const }
const heading = { fontSize: '22px', color: '#0b1220', margin: '8px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#1f2937' }
const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700 as const,
  padding: '12px 20px',
  borderRadius: '12px',
  display: 'inline-block',
  margin: '12px 0',
}
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '13px', lineHeight: '20px', color: '#6b7280', margin: '0' }

export default Email
