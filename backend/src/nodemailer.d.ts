declare module 'nodemailer' {
  interface TransportOptions {
    host?: string
    port?: number
    secure?: boolean
    auth?: { user?: string; pass?: string }
  }
  interface SendMailOptions {
    from?: string
    to?: string | string[]
    subject?: string
    html?: string
  }
  interface Transporter {
    sendMail(options: SendMailOptions): Promise<any>
  }
  function createTransport(options: TransportOptions): Transporter
  const defaultExport: { createTransport: typeof createTransport }
  export default defaultExport
}
