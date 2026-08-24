import nodemailer from 'nodemailer'
<<<<<<< HEAD

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendReminderEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured — email not sent')
    return false
  }
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  })
  return true
=======
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatesPath = path.join(__dirname, '..', 'data', 'email-templates.json')

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  enabled: boolean
}

export function loadTemplates(): EmailTemplate[] {
  if (!fs.existsSync(templatesPath)) return []
  return JSON.parse(fs.readFileSync(templatesPath, 'utf-8'))
}

export function saveTemplates(templates: EmailTemplate[]) {
  fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2))
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, error: 'SMTP credentials not configured' }
  }

  const transporter = createTransporter()
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: htmlBody,
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export function markdownToHtml(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
>>>>>>> orchestrator/task-7-milestone-7-email-system
}
