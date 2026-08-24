import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST
const port = parseInt(process.env.SMTP_PORT || '587', 10)
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!host || !user || !pass) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  }
  return transporter
}

export function isEmailAvailable(): boolean {
  return getTransporter() !== null
}

export async function sendReminder(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter()
  if (!t) return false
  try {
    await t.sendMail({ from: user, to, subject, html })
    return true
  } catch (err) {
    console.error('Email send error:', err)
    return false
  }
}
