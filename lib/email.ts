import nodemailer from 'nodemailer'
import type { TransportOptions } from 'nodemailer'

// Email configuration
interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  tls?: {
    rejectUnauthorized?: boolean
  }
}

// Create transporter
let transporter: nodemailer.Transporter | null = null

export function getEmailTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const config: EmailConfig & TransportOptions = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
      // Add TLS configuration for better compatibility
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates during development
      },
    }

    transporter = nodemailer.createTransport(config)

    // Verify connection
    transporter.verify((error) => {
      if (error) {
        const smtpError = error as { code?: string; command?: string; message: string }
        console.error('Email transporter verification failed:', error)
        console.error('Error code:', smtpError.code)
        console.error('Error command:', smtpError.command)
      } else {
        console.log('Email server is ready to send messages')
      }
    })
  }

  return transporter
}

// Send email verification
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter()

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"SmartTask" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your SmartTask account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 9999px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>SmartTask</h1>
              </div>
              <div class="content">
                <h2>Verify Your Email Address</h2>
                <p>Thanks for signing up for SmartTask! Please click the button below to verify your email address:</p>
                <center>
                  <a href="${verificationUrl}" class="button">Verify Email</a>
                </center>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                <p><strong>This link expires in 24 hours.</strong></p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} SmartTask. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    return true
  } catch (error) {
    console.error('Failed to send verification email:', error)
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Email error details:', error.message)
    }
    return false
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter()

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"SmartTask" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset your SmartTask password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Password</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 9999px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 15px; margin: 15px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>SmartTask</h1>
              </div>
              <div class="content">
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <center>
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </center>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                <div class="warning">
                  <strong>This link expires in 1 hour.</strong>
                </div>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} SmartTask. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    return true
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Email error details:', error.message)
    }
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Email error code:', error.code)
    }
    return false
  }
}
