/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { styles as s } from './_styles.ts'

export interface WelcomeNewUserProps {
  siteName: string
  siteUrl: string
  recipientName: string
  recipientEmail: string
  loginUrl: string
  planName: string
}

const item = (title: string, desc: string) => (
  <div style={{ margin: '0 0 14px' }}>
    <div style={{ fontSize: '15px', fontWeight: 600, color: 'hsl(222, 47%, 11%)' }}>✓ {title}</div>
    <div style={{ fontSize: '14px', color: 'hsl(215, 20%, 40%)', lineHeight: '1.5' }}>{desc}</div>
  </div>
)

export const WelcomeNewUserEmail = (p: WelcomeNewUserProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Welcome to ${p.siteName}, ${p.recipientName}!`}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Heading style={s.h1}>Welcome aboard 🚀</Heading>
        <Text style={s.text}>Hi {p.recipientName}, you're now on the <strong>{p.planName}</strong> plan. Here's what you can do next:</Text>
        {item('Set up your fleet', 'Add vehicles and assign drivers from the Fleet tab.')}
        {item('Create your first route', 'Use Dispatch to plan and optimise deliveries.')}
        {item('Invite your team', 'Bring in ops managers, drivers and dispatchers.')}
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={p.loginUrl} style={s.button}>Go to Dashboard</Button>
        </div>
        <Text style={s.footer}>You're signed in as {p.recipientEmail}. Need help? Just reply to this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeNewUserEmail
