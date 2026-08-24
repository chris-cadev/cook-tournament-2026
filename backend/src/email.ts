import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  transporter = nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: { user, pass },
  })

  return transporter
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transport = getTransporter()
  if (!transport) {
    console.warn('Email not configured, skipping send')
    return false
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error('Failed to send email:', err)
    return false
  }
}

export async function sendTeamConfirmation(to: string, teamName: string, eventName: string): Promise<boolean> {
  return sendEmail(to, `Confirmación de registro - ${eventName}`, `
    <h2>¡Hola, ${teamName}!</h2>
    <p>Tu equipo ha sido registrado exitosamente en <strong>${eventName}</strong>.</p>
    <p>El organizador revisará tu registro y te confirmará pronto.</p>
    <p>¡Nos vemos en la competencia!</p>
  `)
}

export async function sendScoreReveal(to: string, eventName: string, category: string): Promise<boolean> {
  return sendEmail(to, `Puntuaciones reveladas - ${eventName}`, `
    <h2>¡Puntuaciones reveladas!</h2>
    <p>La categoría <strong>${category}</strong> ha sido revelada en <strong>${eventName}</strong>.</p>
    <p>Visita la página de resultados para ver las puntuaciones actualizadas.</p>
  `)
}
