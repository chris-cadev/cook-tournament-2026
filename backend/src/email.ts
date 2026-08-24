import nodemailer from 'nodemailer'
import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
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
    await t.sendMail({ from: process.env.SMTP_USER, to, subject, html })
    return true
  } catch (err) {
    console.error('Email send error:', err)
    return false
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  logId?: number,
): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter()
  if (!t) return { ok: false, error: 'SMTP not configured' }
  try {
    let finalHtml = html
    if (logId) {
      const pixelUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/email/pixel/${logId}`
      finalHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`
    }
    await t.sendMail({ from: process.env.SMTP_USER, to, subject, html: finalHtml })
    return { ok: true }
  } catch (err: any) {
    console.error('Email send error:', err)
    return { ok: false, error: err?.message || 'Send failed' }
  }
}

export function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<')) return line
      return line
    })
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<li') || line.startsWith('</')) return line
      return `<p>${line}</p>`
    })
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  enabled: boolean
}

const TEMPLATES_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../data/email-templates.json',
)

export function loadTemplates(): EmailTemplate[] {
  try {
    if (!existsSync(TEMPLATES_PATH)) return []
    const data = readFileSync(TEMPLATES_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function saveTemplates(templates: EmailTemplate[]): void {
  const dir = path.dirname(TEMPLATES_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(TEMPLATES_PATH, JSON.stringify(templates, null, 2))
}
