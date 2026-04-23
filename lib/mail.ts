import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html?: string
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured. Email not sent:', { to, subject })
    return
  }

  try {
    await transporter.sendMail({
      from: `"SmartTask" <${process.env.SMTP_FROM || 'noreply@smarttask.com'}>`,
      to,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}
