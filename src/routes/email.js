import express from 'express'
import nodemailer from 'nodemailer'

export async function initEmailRouter() {
  const router = express.Router()
  const SMTP_PROVIDER = (process.env.SMTP_PROVIDER || 'ethereal').toLowerCase()

  let transporter

  try {
    if (SMTP_PROVIDER === 'gmail') {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
        throw new Error('Missing GMAIL_USER or GMAIL_APP_PASS for Gmail provider')
      }
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASS
        }
      })
      await transporter.verify()
      console.log('📧 Gmail transporter ready')
    } else {
      // Ethereal (dev)
      const etherealAccount = await nodemailer.createTestAccount()
      transporter = nodemailer.createTransport({
        host: etherealAccount.smtp.host,
        port: etherealAccount.smtp.port,
        secure: etherealAccount.smtp.secure,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        }
      })
      console.log('📧 Ethereal transporter ready (test account)')
    }
  } catch (err) {
    console.error('Failed to initialize email transporter:', err)
    throw err 
  }

  router.post('/send-email', async (req, res) => {
    try {
      const { name, email, subject, message, to } = req.body || {}
      if (!name || !email || !message) {
        return res.status(400).json({ ok: false, error: 'name, email and message are required' })
      }

      const recipient = to || process.env.TO_EMAIL || process.env.GMAIL_USER || 'recipient@example.com'
      const mailOptions = {
        from: process.env.FROM_EMAIL || `"${name}" <${email}>`,
        to: recipient,
        subject: subject ? `${subject} — from ${name}` : `Message from ${name}`,
        text: `${message}\n\nFrom: ${name} <${email}>`,
        html: `<p>${message.replace(/\n/g, '<br>')}</p><hr><p>From: ${name} &lt;${email}&gt;</p>`
      }

      const info = await transporter.sendMail(mailOptions)
      const previewUrl = nodemailer.getTestMessageUrl(info) || null
      return res.json({ ok: true, messageId: info.messageId, previewUrl })
    } catch (err) {
      console.error('Send email error:', err)
      return res.status(500).json({ ok: false, error: 'Failed to send email' })
    }
  })

  return router
}
