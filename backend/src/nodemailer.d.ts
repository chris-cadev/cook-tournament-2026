declare module 'nodemailer' {
  export interface TransportOptions {
    host?: string
    port?: number
    secure?: boolean
    auth?: { user?: string; pass?: string }
  }
  export interface SendMailOptions {
    from?: string
    to?: string | string[]
    subject?: string
    html?: string
  }
  export interface Transporter {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendMail(options: SendMailOptions): Promise<any>
  }
  export function createTransport(options: TransportOptions): Transporter
}
