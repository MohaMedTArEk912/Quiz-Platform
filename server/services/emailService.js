import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Ensure environment variables are loaded even when imported in worker threads or standalone scripts
if (!process.env.GMAIL_USER && !process.env.SMTP_HOST) {
  dotenv.config();
}

let transporter = null;
let isEthereal = false;

/**
 * Escapes HTML characters to prevent HTML injection in emails
 */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Resolves the professional "From" address with display name
 */
export function resolveFromAddress(customDisplayName) {
  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) {
    return process.env.EMAIL_FROM.trim();
  }
  const user = process.env.GMAIL_USER?.trim() || process.env.SMTP_USER?.trim();
  const displayName = customDisplayName || 'Quiz Platform';
  if (user) {
    return `"${displayName}" <${user}>`;
  }
  return `"${displayName}" <support@quizplatform.com>`;
}

/**
 * Initializes and caches the Nodemailer transporter.
 * Supports:
 *  1. Gmail Direct / App Password (GMAIL_USER & GMAIL_APP_PASSWORD)
 *  2. Standard SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE)
 *  3. Fallback: Ethereal test mailbox or console logger for development (never in production)
 */
export async function getTransporter(forceRefresh = false) {
  if (transporter && !forceRefresh) return transporter;

  const {
    GMAIL_USER,
    GMAIL_APP_PASSWORD,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    NODE_ENV
  } = process.env;

  const isProduction = NODE_ENV === 'production';
  const isServerless = Boolean(
    process.env.VERCEL || 
    process.env.AWS_LAMBDA_FUNCTION_NAME || 
    process.env.NETLIFY || 
    process.env.SERVERLESS
  );

  // 1. Direct Gmail Configuration (Prioritized)
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    const cleanUser = String(GMAIL_USER).replace(/^["']|["']$/g, '').trim();
    // Google App Passwords are 16 letters, often copied with spaces like "noqn acir cilw ciqm"
    const cleanPass = String(GMAIL_APP_PASSWORD).replace(/^["']|["']$/g, '').replace(/\s+/g, '').trim();

    try {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL/TLS
        auth: {
          user: cleanUser,
          pass: cleanPass
        },
        // Production stability settings
        pool: !isServerless,
        maxConnections: 3,
        maxMessages: 100,
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 10000,   // 10 seconds
        socketTimeout: 30000,     // 30 seconds
        tls: {
          rejectUnauthorized: isProduction
        }
      });

      isEthereal = false;
      console.log('📧 [EmailService] Initialized production-ready Gmail transporter for', cleanUser);
      return transporter;
    } catch (err) {
      console.error('❌ [EmailService] Failed to initialize Gmail transport:', err.message);
    }
  }

  // 2. Standard SMTP Server
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const cleanHost = String(SMTP_HOST).replace(/^["']|["']$/g, '').trim();
    const cleanPort = parseInt(SMTP_PORT, 10) || 587;
    const cleanUser = String(SMTP_USER).replace(/^["']|["']$/g, '').trim();
    const cleanPass = String(SMTP_PASS).replace(/^["']|["']$/g, '').trim();
    const isSecure = SMTP_SECURE === 'true' || cleanPort === 465;

    try {
      transporter = nodemailer.createTransport({
        host: cleanHost,
        port: cleanPort,
        secure: isSecure,
        auth: {
          user: cleanUser,
          pass: cleanPass
        },
        pool: !isServerless,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
        tls: {
          rejectUnauthorized: isProduction
        }
      });

      isEthereal = false;
      console.log(`📧 [EmailService] Initialized SMTP transporter (${cleanHost}:${cleanPort})`);
      return transporter;
    } catch (err) {
      console.error('❌ [EmailService] Failed to initialize SMTP transport:', err.message);
    }
  }

  // In production, refuse to leak sensitive user emails to public Ethereal test mailboxes
  if (isProduction) {
    console.error('❌ [EmailService] CRITICAL: No valid email credentials configured in production.');
    transporter = null;
    isEthereal = false;
    return null;
  }

  // 3. Fallback for Development: Ethereal email test account
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    isEthereal = true;
    console.log('🧪 [EmailService] No live SMTP provided. Created Ethereal test account:', testAccount.user);
    return transporter;
  } catch (err) {
    console.warn('⚠️ [EmailService] Could not create Ethereal account (offline or timeout). Mail will be simulated in console.');
    transporter = null;
    isEthereal = false;
    return null;
  }
}

/**
 * Verifies email connection and credentials.
 * Safe to call at startup or from health checks.
 */
export async function verifyEmailService() {
  try {
    const mailTransporter = await getTransporter();
    if (!mailTransporter) {
      return {
        ready: false,
        provider: 'none',
        error: 'No email transporter configured'
      };
    }
    if (isEthereal) {
      return {
        ready: true,
        provider: 'ethereal',
        sender: 'ethereal-test-account'
      };
    }

    await mailTransporter.verify();
    const provider = process.env.GMAIL_USER ? 'gmail' : 'smtp';
    const sender = resolveFromAddress();
    console.log(`✅ [EmailService] Transporter verified & ready for production (${provider}: ${sender})`);
    return {
      ready: true,
      provider,
      sender
    };
  } catch (err) {
    console.error(`❌ [EmailService] Transporter verification failed:`, err.message);
    return {
      ready: false,
      error: err.message
    };
  }
}

/**
 * Dispatches a support ticket notification email to the engineering/admin team
 * and optionally sends a confirmation receipt to the user.
 */
export async function sendSupportEmail({
  ticketId,
  email,
  name,
  subject,
  category = 'general',
  message,
  userId
}) {
  const targetRecipient = process.env.SUPPORT_EMAIL_TO || process.env.GMAIL_USER || 'mohaamedtariq12@gmail.com';
  const mailTransporter = await getTransporter();

  const safeEmail = escapeHtml(email);
  const safeName = escapeHtml(name || 'Anonymous User');
  const safeSubject = escapeHtml(subject);
  const safeCategory = escapeHtml(category.toUpperCase());
  const safeUserId = escapeHtml(userId || 'Guest (Not logged in)');
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  const dateFormatted = new Date().toUTCString();

  const fromAddress = resolveFromAddress('Quiz Platform Support');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 620px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: #8b5cf6; padding: 24px; border-bottom: 2.5px solid #000000; color: #ffffff; }
          .badge { display: inline-block; background: #fef08a; color: #000000; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 8px; border: 1.5px solid #000000; margin-top: 8px; }
          .content { padding: 24px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .label { font-weight: bold; color: #64748b; width: 120px; }
          .message-box { background: #f1f5f9; border: 2px solid #000000; border-radius: 12px; padding: 18px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
          .footer { background: #f8fafc; padding: 16px 24px; border-top: 2px solid #000000; font-size: 12px; color: #64748b; text-align: center; }
          .reply-btn { display: inline-block; background: #000000; color: #ffffff !important; text-decoration: none; font-weight: bold; font-size: 13px; padding: 10px 20px; border-radius: 10px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">⚡ New Support Ticket Received</h1>
            <div class="badge">${safeCategory}</div>
          </div>
          <div class="content">
            <table class="info-table">
              <tr>
                <td class="label">Ticket ID:</td>
                <td><strong style="font-family: monospace;">#${escapeHtml(ticketId)}</strong></td>
              </tr>
              <tr>
                <td class="label">From:</td>
                <td><strong>${safeName}</strong> &lt;<a href="mailto:${safeEmail}" style="color: #6366f1;">${safeEmail}</a>&gt;</td>
              </tr>
              <tr>
                <td class="label">User ID:</td>
                <td><code>${safeUserId}</code></td>
              </tr>
              <tr>
                <td class="label">Subject:</td>
                <td><strong>${safeSubject}</strong></td>
              </tr>
              <tr>
                <td class="label">Date:</td>
                <td>${dateFormatted}</td>
              </tr>
            </table>

            <h3 style="margin: 16px 0 8px 0; font-size: 14px; text-transform: uppercase; color: #475569;">Description & Details</h3>
            <div class="message-box">${safeMessage}</div>

            <div style="text-align: center;">
              <a href="mailto:${safeEmail}?subject=Re:%20[Ticket%20%23${escapeHtml(ticketId)}]%20${encodeURIComponent(subject)}" class="reply-btn">
                Reply Directly to User (${safeEmail})
              </a>
            </div>
          </div>
          <div class="footer">
            Quiz Platform Enterprise Support Desk • Automated Dispatch to ${escapeHtml(targetRecipient)}
          </div>
        </div>
      </body>
    </html>
  `;

  // Fallback if transporter is unavailable
  if (!mailTransporter) {
    console.log(`\n======================================================`);
    console.log(`📨 [SIMULATED SUPPORT EMAIL DISPATCH]`);
    console.log(`To: ${targetRecipient}`);
    console.log(`Reply-To: ${email}`);
    console.log(`Subject: [Ticket #${ticketId}] ${subject}`);
    console.log(`Category: ${category}`);
    console.log(`Message: ${message}`);
    console.log(`======================================================\n`);

    return {
      success: true,
      status: 'simulated',
      messageId: `sim-${Date.now()}`
    };
  }

  try {
    const mailOptions = {
      from: fromAddress,
      to: targetRecipient,
      replyTo: email,
      subject: `[Support Ticket #${ticketId}] ${subject}`,
      text: `Support Ticket #${ticketId}\nCategory: ${category}\nFrom: ${name || 'User'} <${email}>\nUser ID: ${userId || 'Guest'}\n\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: htmlContent
    };

    const info = await mailTransporter.sendMail(mailOptions);
    let previewUrl = '';

    if (isEthereal) {
      previewUrl = nodemailer.getTestMessageUrl(info) || '';
      console.log('📬 [EmailService] Test email preview available at:', previewUrl);
    } else {
      console.log('✅ [EmailService] Real email successfully delivered to', targetRecipient, 'Message ID:', info.messageId);
    }

    // Attempt sending confirmation receipt back to user (non-blocking)
    sendConfirmationReceipt(mailTransporter, fromAddress, email, ticketId, subject).catch((err) => {
      console.warn('⚠️ [EmailService] Could not send receipt to user:', err.message);
    });

    return {
      success: true,
      status: isEthereal ? 'simulated' : 'sent',
      messageId: info.messageId,
      previewUrl
    };
  } catch (error) {
    console.error('❌ [EmailService] Failed to send email via transporter:', error);
    return {
      success: false,
      status: 'failed',
      error: error.message || 'Email delivery failed'
    };
  }
}

/**
 * Core mail dispatcher used by all features with automatic fallbacks and error handling
 */
export async function dispatchMail({ to, subject, html, text }) {
  if (!to) {
    console.warn('⚠️ [EmailService] dispatchMail called with no recipient address.');
    return { success: false, status: 'no_recipient' };
  }

  const mailTransporter = await getTransporter();
  const fromAddress = resolveFromAddress();

  if (!mailTransporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [SIMULATED EMAIL DISPATCH]`);
    console.log(`To: ${to}`);
    console.log(`From: ${fromAddress}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || '(HTML only)'}`);
    console.log(`======================================================\n`);
    return {
      success: process.env.NODE_ENV !== 'production',
      status: 'simulated',
      messageId: `sim-${Date.now()}`
    };
  }

  // Attempt delivery with 1 retry for transient network errors (socket resets, timeouts)
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await mailTransporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: text || subject,
        html
      });

      let previewUrl = '';
      if (isEthereal) {
        previewUrl = nodemailer.getTestMessageUrl(info) || '';
        console.log('📬 [EmailService] Test email preview available at:', previewUrl);
      } else {
        console.log('✅ [EmailService] Delivered email to', to, '| Subject:', subject, '| ID:', info.messageId);
      }

      return {
        success: true,
        status: isEthereal ? 'simulated' : 'sent',
        messageId: info.messageId,
        previewUrl
      };
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ [EmailService] Attempt ${attempt} failed delivering to ${to}:`, err.message);
      if (attempt === 1 && (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ESOCKET')) {
        await new Promise((res) => setTimeout(res, 1000));
        await getTransporter(true); // force refresh transporter
      } else {
        break;
      }
    }
  }

  console.error('❌ [EmailService] Failed delivering email to', to, ':', lastError?.message || lastError);
  return { success: false, status: 'failed', error: lastError?.message || 'Email delivery failed' };
}

/**
 * Sends a welcome email when a user registers
 */
export async function sendWelcomeEmail({ email, name, userId }) {
  const safeName = escapeHtml(name || 'Champion');
  const safeUserId = escapeHtml(userId || '');
  const subject = `Welcome to Quiz Platform, ${safeName}! 🚀`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 28px 24px; border-bottom: 2.5px solid #000000; color: #ffffff; text-align: center; }
          .content { padding: 24px; line-height: 1.6; }
          .badge { display: inline-block; background: #bef264; color: #000000; font-weight: 800; font-size: 11px; padding: 4px 12px; border-radius: 9999px; border: 1.5px solid #000; }
          .feature-box { background: #f8fafc; border: 2px solid #000; border-radius: 12px; padding: 14px 18px; margin: 12px 0; font-size: 13px; }
          .cta-btn { display: inline-block; background: #000000; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 12px; margin-top: 18px; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">ACCOUNT READY</span>
            <h1 style="margin: 10px 0 0 0; font-size: 24px; font-weight: 900;">Welcome to Quiz Platform! ⚡</h1>
          </div>
          <div class="content">
            <p>Hey <strong>${safeName}</strong>,</p>
            <p>Your account (<code>${safeUserId}</code>) has been successfully created. You are now ready to test your knowledge, compete on the leaderboards, and master your skills!</p>
            
            <h3 style="margin-top: 18px; font-size: 14px; text-transform: uppercase;">Here is how to get started:</h3>
            <div class="feature-box">
              🎯 <strong>Take Your First Quiz:</strong> Browse skill tracks and start answering questions to earn XP and level up.
            </div>
            <div class="feature-box">
              🛡️ <strong>Join or Create a Clan:</strong> Team up with friends, chat in real-time, and climb the clan leaderboard.
            </div>
            <div class="feature-box">
              🎮 <strong>Live Classroom Arena:</strong> Challenge peers in synchronized real-time turn-based quiz battles.
            </div>

            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:5173'}" class="cta-btn">Enter Quiz Platform →</a>
            </div>
          </div>
          <div class="footer">
            Quiz Platform • Happy Learning & Quiz Taking!
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `Welcome to Quiz Platform, ${safeName}!\n\nYour account has been created. Start taking quizzes, earning XP, and climbing the leaderboard today at ${process.env.APP_URL || 'http://localhost:5173'}.`,
    html
  });
}

/**
 * Sends a password reset verification code email
 */
export async function sendPasswordResetEmail({ email, name, resetCode }) {
  const safeName = escapeHtml(name || 'User');
  const safeCode = escapeHtml(resetCode);
  const subject = `Your Password Reset Code: ${safeCode} 🔒`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: #f59e0b; padding: 24px; border-bottom: 2.5px solid #000000; color: #ffffff; text-align: center; }
          .content { padding: 24px; text-align: center; line-height: 1.6; }
          .code-box { display: inline-block; background: #fef3c7; border: 2.5px solid #000; border-radius: 12px; padding: 16px 32px; font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #000; margin: 18px 0; box-shadow: 3px 3px 0px #000; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; font-weight: 900;">Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${safeName}</strong>,</p>
            <p>We received a request to reset the password for your Quiz Platform account. Use the 6-digit verification code below to complete your reset:</p>
            
            <div class="code-box">${safeCode}</div>
            
            <p style="font-size: 13px; color: #64748b;">
              ⏱️ This verification code expires in <strong>15 minutes</strong>.<br/>
              If you did not request a password reset, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            Quiz Platform Security Desk • Keep your credentials safe
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `Hello ${safeName},\n\nYour Quiz Platform password reset code is: ${safeCode}\n\nThis code is valid for 15 minutes. If you did not request this, please ignore this email.`,
    html
  });
}

/**
 * Sends a password changed confirmation email
 */
export async function sendPasswordChangedEmail({ email, name }) {
  const safeName = escapeHtml(name || 'User');
  const subject = `Your Password Was Successfully Changed 🔑`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: #10b981; padding: 24px; border-bottom: 2.5px solid #000000; color: #ffffff; text-align: center; }
          .content { padding: 24px; line-height: 1.6; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; font-weight: 900;">Password Changed ✅</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${safeName}</strong>,</p>
            <p>This is a confirmation that the password for your Quiz Platform account has been successfully updated on ${new Date().toUTCString()}.</p>
            <p style="background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 8px; padding: 12px; font-size: 13px; color: #991b1b;">
              ⚠️ <strong>Did not make this change?</strong> Please contact support immediately through the platform support form to secure your account.
            </p>
          </div>
          <div class="footer">
            Quiz Platform Security Team
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `Hello ${safeName},\n\nYour Quiz Platform account password was changed on ${new Date().toUTCString()}.\n\nIf you did not make this change, please contact support immediately.`,
    html
  });
}

/**
 * Sends an email notification when a track access request is approved by an admin
 */
export async function sendTrackApprovalEmail({ email, name, subjectTitle, adminNote }) {
  const safeName = escapeHtml(name || 'Student');
  const safeTrack = escapeHtml(subjectTitle || 'Requested Track');
  const safeNote = escapeHtml(adminNote || '');
  const subject = `Track Access Approved: "${safeTrack}" 🎉`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: #8b5cf6; padding: 24px; border-bottom: 2.5px solid #000000; color: #ffffff; }
          .content { padding: 24px; line-height: 1.6; }
          .note-box { background: #ede9fe; border: 2px solid #000; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; }
          .btn { display: inline-block; background: #000; color: #fff !important; text-decoration: none; font-weight: 800; font-size: 13px; padding: 10px 22px; border-radius: 10px; margin-top: 14px; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px; font-weight: 900;">Track Access Approved! 🌟</h1>
          </div>
          <div class="content">
            <p>Hey <strong>${safeName}</strong>,</p>
            <p>Great news! The administrator has reviewed and approved your access request for <strong>"${safeTrack}"</strong>.</p>
            <p>All learning modules, practice quizzes, and milestones in this track are now fully unlocked for your account.</p>
            
            ${safeNote ? `<div class="note-box"><strong>Admin Note:</strong> ${safeNote}</div>` : ''}

            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:5173'}/tracks" class="btn">Start Learning Now →</a>
            </div>
          </div>
          <div class="footer">
            Quiz Platform Track Management
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `Hello ${safeName},\n\nYour access request for track "${safeTrack}" has been approved! All modules are now unlocked.\n${safeNote ? `Admin Note: ${safeNote}\n` : ''}\nLogin at: ${process.env.APP_URL || 'http://localhost:5173'}/tracks`,
    html
  });
}

/**
 * Sends an email notification when a track access request is rejected
 */
export async function sendTrackRejectionEmail({ email, name, subjectTitle, adminNote }) {
  const safeName = escapeHtml(name || 'Student');
  const safeTrack = escapeHtml(subjectTitle || 'Requested Track');
  const safeNote = escapeHtml(adminNote || 'No specific note provided. You may review and request again.');
  const subject = `Update Regarding Your Track Request: "${safeTrack}"`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: #64748b; padding: 24px; border-bottom: 2.5px solid #000000; color: #ffffff; }
          .content { padding: 24px; line-height: 1.6; }
          .note-box { background: #f1f5f9; border: 2px solid #000; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px; font-weight: 900;">Track Request Update</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${safeName}</strong>,</p>
            <p>Your request for access to <strong>"${safeTrack}"</strong> was reviewed by the instructor/administrator and was not approved at this time.</p>
            
            <div class="note-box">
              <strong>Feedback from Administrator:</strong><br/>
              ${safeNote}
            </div>

            <p style="font-size: 13px; color: #64748b;">
              You can check the prerequisites or submit an updated request on the Skill Tracks page.
            </p>
          </div>
          <div class="footer">
            Quiz Platform Track Management
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `Hello ${safeName},\n\nYour request for access to "${safeTrack}" was declined.\nAdmin Feedback: ${safeNote}\n\nQuiz Platform Team`,
    html
  });
}

/**
 * Sends a Clan Invitation email to an invited user
 */
export async function sendClanInviteEmail({ email, recipientName, inviterName, clanName, clanTag }) {
  const safeRecipient = escapeHtml(recipientName || 'Player');
  const safeInviter = escapeHtml(inviterName || 'A player');
  const safeClan = escapeHtml(clanName || 'Clan');
  const safeTag = escapeHtml(clanTag || '');
  const subject = `⚔️ ${safeInviter} invited you to join [${safeTag}] ${safeClan}!`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 24px; border-bottom: 2.5px solid #000000; color: #ffffff; text-align: center; }
          .content { padding: 24px; line-height: 1.6; text-align: center; }
          .clan-badge { display: inline-block; background: #ddd6fe; border: 2px solid #000; border-radius: 12px; padding: 12px 24px; font-weight: 900; font-size: 18px; margin: 16px 0; box-shadow: 3px 3px 0px #000; }
          .btn { display: inline-block; background: #bef264; color: #000 !important; text-decoration: none; font-weight: 900; font-size: 14px; padding: 12px 28px; border-radius: 12px; border: 2px solid #000; box-shadow: 3px 3px 0px #000; margin-top: 14px; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; font-weight: 900;">Clan Invitation Received! 🛡️</h1>
          </div>
          <div class="content">
            <p>Hey <strong>${safeRecipient}</strong>,</p>
            <p><strong>${safeInviter}</strong> has invited you to join their guild:</p>
            
            <div class="clan-badge">
              [${safeTag}] ${safeClan}
            </div>

            <p style="font-size: 14px; color: #475569;">
              Join forces, participate in clan challenges, chat in the private hub, and earn shared XP!
            </p>

            <div>
              <a href="${process.env.APP_URL || 'http://localhost:5173'}/clans" class="btn">View & Accept Invitation →</a>
            </div>
          </div>
          <div class="footer">
            Quiz Platform Clan Hub
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `Hello ${safeRecipient},\n\n${safeInviter} invited you to join their clan: [${safeTag}] ${safeClan}!\n\nOpen Clan Hub to accept: ${process.env.APP_URL || 'http://localhost:5173'}/clans`,
    html
  });
}

/**
 * Sends a Tournament Invitation email to an invited user
 */
export async function sendTournamentInviteEmail({
  email,
  recipientName,
  inviterName,
  tournamentName,
  tournamentId,
  startsAt,
  note
}) {
  const safeRecipient = escapeHtml(recipientName || 'Competitor');
  const safeInviter = escapeHtml(inviterName || 'A competitor');
  const safeTournament = escapeHtml(tournamentName || 'Tournament Arena');
  const safeNote = note ? escapeHtml(note) : '';
  const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const inviteUrl = `${appUrl}/tournaments?invite=${encodeURIComponent(tournamentId)}`;
  const kickoffStr = startsAt ? new Date(startsAt).toUTCString() : 'Scheduled';
  const subject = `🏆 ${safeInviter} invited you to "${safeTournament}"!`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: #fde047; padding: 24px; border-bottom: 2.5px solid #000000; color: #000000; text-align: center; }
          .content { padding: 24px; line-height: 1.6; text-align: center; }
          .arena-badge { display: inline-block; background: #fef9c3; border: 2px solid #000; border-radius: 12px; padding: 12px 24px; font-weight: 900; font-size: 18px; margin: 14px 0; box-shadow: 3px 3px 0px #000; }
          .note-box { background: #f1f5f9; border: 2px solid #000; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin: 12px 0; font-style: italic; }
          .btn { display: inline-block; background: #bef264; color: #000 !important; text-decoration: none; font-weight: 900; font-size: 14px; padding: 12px 28px; border-radius: 12px; border: 2px solid #000; box-shadow: 3px 3px 0px #000; margin-top: 14px; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; font-weight: 900;">Tournament Invitation! 🏆</h1>
          </div>
          <div class="content">
            <p>Hey <strong>${safeRecipient}</strong>,</p>
            <p><strong>${safeInviter}</strong> has invited you to compete in:</p>
            <div class="arena-badge">${safeTournament}</div>
            <p style="font-size: 13px; color: #475569; margin: 6px 0;">
              <strong>Kickoff (UTC):</strong> ${escapeHtml(kickoffStr)}
            </p>
            ${safeNote ? `<div class="note-box">"${safeNote}"</div>` : ''}
            <div>
              <a href="${inviteUrl}" class="btn">View & Join Tournament →</a>
            </div>
          </div>
          <div class="footer">
            Quiz Platform Competitive Arenas
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `Hey ${safeRecipient},\n\n${safeInviter} invited you to compete in "${safeTournament}"!\nKickoff (UTC): ${kickoffStr}${safeNote ? `\nNote: "${safeNote}"` : ''}\n\nJoin here: ${inviteUrl}`,
    html
  });
}

/**
 * Sends a Quiz Result scorecard email
 */
export async function sendQuizResultEmail({
  email,
  name,
  quizTitle,
  score,
  totalQuestions,
  percentage,
  passed,
  timeTaken
}) {
  const safeName = escapeHtml(name || 'Quizzer');
  const safeQuiz = escapeHtml(quizTitle || 'Quiz');
  const safeScore = escapeHtml(String(score ?? 0));
  const safeTotal = escapeHtml(String(totalQuestions ?? 0));
  const safePercent = Math.round(Number(percentage) || 0);
  const timeFormatted = `${Math.floor((timeTaken || 0) / 60)}m ${(timeTaken || 0) % 60}s`;
  const subject = `${passed ? '🏆 Passed' : '📊 Scorecard'}: ${safeQuiz} (${safePercent}%)`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: ${passed ? '#10b981' : '#6366f1'}; padding: 24px; border-bottom: 2.5px solid #000000; color: #ffffff; text-align: center; }
          .content { padding: 24px; line-height: 1.6; }
          .stats-grid { display: flex; gap: 12px; margin: 16px 0; }
          .stat-card { flex: 1; background: #f8fafc; border: 2px solid #000; border-radius: 12px; padding: 12px; text-align: center; }
          .stat-val { font-size: 22px; font-weight: 900; }
          .stat-lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; font-weight: 900;">${passed ? '🎉 Congratulations!' : '📊 Quiz Scorecard'}</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">${safeQuiz}</p>
          </div>
          <div class="content">
            <p>Hey <strong>${safeName}</strong>,</p>
            <p>Here is your official performance scorecard for <strong>"${safeQuiz}"</strong>:</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 10px; border: 2px solid #000; background: #f8fafc; text-align: center;">
                  <div style="font-size: 26px; font-weight: 900; color: ${passed ? '#059669' : '#4f46e5'};">${safePercent}%</div>
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase;">Accuracy</div>
                </td>
                <td style="padding: 10px; border: 2px solid #000; background: #f8fafc; text-align: center;">
                  <div style="font-size: 26px; font-weight: 900;">${safeScore}</div>
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase;">Points Earned</div>
                </td>
                <td style="padding: 10px; border: 2px solid #000; background: #f8fafc; text-align: center;">
                  <div style="font-size: 26px; font-weight: 900;">${timeFormatted}</div>
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase;">Time Taken</div>
                </td>
              </tr>
            </table>

            <p style="text-align: center; font-size: 14px;">
              Status: <strong style="color: ${passed ? '#059669' : '#dc2626'};">${passed ? 'PASSED ✅' : 'ATTEMPTED 📝'}</strong>
            </p>
          </div>
          <div class="footer">
            Quiz Platform Results System
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `Quiz Scorecard for ${safeName}\n\nQuiz: ${safeQuiz}\nAccuracy: ${safePercent}%\nScore: ${safeScore}\nTime: ${timeFormatted}\nStatus: ${passed ? 'PASSED' : 'ATTEMPTED'}`,
    html
  });
}

/**
 * Sends a confirmation receipt email back to the user
 */
async function sendConfirmationReceipt(mailTransporter, fromAddress, userEmail, ticketId, subject) {
  const safeSubject = escapeHtml(subject);
  const safeTicketId = escapeHtml(ticketId);

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px;">
        <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000; border-radius: 16px; box-shadow: 5px 5px 0px #000; padding: 24px;">
          <h2 style="margin-top: 0; color: #8b5cf6;">Ticket Received: #${safeTicketId}</h2>
          <p>Hello,</p>
          <p>We've received your support request regarding <strong>"${safeSubject}"</strong>.</p>
          <p>Our engineering and support team will review your inquiry and respond directly to this email address within 24 hours.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">— The Quiz Platform Team</p>
        </div>
      </body>
    </html>
  `;

  await mailTransporter.sendMail({
    from: fromAddress,
    to: userEmail,
    subject: `Ticket Received: #${ticketId} - ${subject}`,
    text: `Hello,\n\nWe have received your support request regarding "${subject}". Our team will review it and reply within 24 hours.\n\nTicket Reference: #${ticketId}\nQuiz Platform Team`,
    html: receiptHtml
  });
}

/**
 * Sends a welcome confirmation email when a user subscribes to Weekly Challenges & Tracks
 */
export async function sendWeeklyChallengeWelcomeEmail({ email, name, unsubscribeToken }) {
  const safeName = escapeHtml(name || 'Coder');
  const safeEmail = escapeHtml(email);
  const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(unsubscribeToken || '')}`;
  const subject = `⚡ You're Subscribed! New Weekly Challenges & Tracks Await`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: linear-gradient(135deg, #facc15, #bef264); padding: 28px 24px; border-bottom: 2.5px solid #000000; color: #000000; text-align: center; }
          .badge { display: inline-block; background: #000000; color: #bef264; font-weight: 900; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 26px 24px; line-height: 1.6; }
          .feature-box { background: #fdfae7; border: 2px solid #000000; border-radius: 12px; padding: 14px 18px; margin: 12px 0; font-size: 13px; box-shadow: 2px 2px 0px #000; }
          .feature-box strong { color: #000; font-weight: 800; }
          .cta-btn { display: inline-block; background: #bef264; color: #000000 !important; text-decoration: none; font-weight: 900; font-size: 14px; padding: 12px 30px; border-radius: 12px; border: 2px solid #000; box-shadow: 3px 3px 0px #000; margin-top: 18px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { background: #f1f5f9; padding: 16px 20px; border-top: 2px solid #000000; font-size: 11px; color: #64748b; text-align: center; }
          .unsubscribe-link { color: #94a3b8; text-decoration: underline; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">WEEKLY CHALLENGES DISPATCH</span>
            <h1 style="margin: 12px 0 0 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Welcome to Challenge Drops! 🚀</h1>
          </div>
          <div class="content">
            <p style="font-size: 15px;">Hey <strong>${safeName}</strong>,</p>
            <p>You're officially on the priority alert list for <strong>Quiz Platform Weekly Challenges & Learning Track Drops</strong>.</p>
            
            <p>Every week, our algorithms drop fresh coding puzzles, technical deep dives, and competitive duels directly onto the platform.</p>

            <h3 style="margin-top: 20px; margin-bottom: 8px; font-size: 13px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.5px;">What you will receive:</h3>
            
            <div class="feature-box">
              🧠 <strong>Algorithmic Compiler Challenges:</strong> Hands-on data structures, algorithms, and real-time coding problems with automated test-case runner (JavaScript, Python, C++, Java).
            </div>
            
            <div class="feature-box">
              🗺️ <strong>New Learning Track Releases:</strong> Full chapter storylines and knowledge tracks spanning System Design, Backend Architecture, Algorithms, and Frontend Engineering.
            </div>

            <div class="feature-box">
              ⚡ <strong>Daily Challenge Streaks & Badges:</strong> Earn double XP, gems, streak rewards, and unlock legendary badge nodes for your profile tree.
            </div>

            <div style="text-align: center; margin: 24px 0 8px 0;">
              <a href="${baseUrl}/daily" class="cta-btn">Start Today's Challenge →</a>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 8px 0;">Quiz Platform • Powered by Real-Time Code Execution & Gamified Learning</p>
            <p style="margin: 0;">Subscribed as ${safeEmail}. <a href="${unsubscribeUrl}" class="unsubscribe-link">Unsubscribe at any time</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `You're Subscribed to Weekly Challenges & Tracks!\n\nHey ${safeName},\n\nYou'll be the first to know when new algorithmic challenges and learning tracks drop.\n\nPractice today's challenge: ${baseUrl}/daily\n\nTo unsubscribe: ${unsubscribeUrl}`,
    html
  });
}

/**
 * Broadcasts a new Weekly Challenge or Track Drop announcement to all active subscribers
 */
export async function sendChallengeDropBroadcastEmail({ email, name, challengeTitle, challengeDescription, trackCategory, challengeUrl, unsubscribeToken }) {
  const safeName = escapeHtml(name || 'Champion');
  const safeTitle = escapeHtml(challengeTitle || 'New Weekly Algorithmic Challenge');
  const safeDesc = escapeHtml(challengeDescription || 'A new algorithmic challenge has just dropped on the platform. Test your code, pass all test cases, and climb the leaderboard.');
  const safeCategory = escapeHtml(trackCategory || 'Algorithms');
  const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  const targetUrl = challengeUrl || `${baseUrl}/daily`;
  const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(unsubscribeToken || '')}`;
  const subject = `🔥 New Challenge Dropped: ${safeTitle}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .card { max-width: 580px; margin: 0 auto; background: #ffffff; border: 2.5px solid #000000; border-radius: 16px; box-shadow: 6px 6px 0px #000000; overflow: hidden; }
          .header { background: #8b5cf6; padding: 26px 24px; border-bottom: 2.5px solid #000000; color: #ffffff; text-align: center; }
          .badge { display: inline-block; background: #bef264; color: #000000; font-weight: 900; font-size: 11px; padding: 4px 12px; border-radius: 9999px; border: 1.5px solid #000; text-transform: uppercase; }
          .content { padding: 24px; line-height: 1.6; }
          .challenge-card { background: #f8fafc; border: 2.5px solid #000000; border-radius: 14px; padding: 18px; margin: 16px 0; box-shadow: 3px 3px 0px #000; }
          .cta-btn { display: inline-block; background: #bef264; color: #000000 !important; text-decoration: none; font-weight: 900; font-size: 14px; padding: 12px 28px; border-radius: 12px; border: 2px solid #000; box-shadow: 3px 3px 0px #000; margin-top: 14px; text-transform: uppercase; }
          .footer { background: #f1f5f9; padding: 14px 20px; border-top: 2px solid #000000; font-size: 11px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">${safeCategory}</span>
            <h1 style="margin: 10px 0 0 0; font-size: 22px; font-weight: 900;">Weekly Challenge Drop ⚡</h1>
          </div>
          <div class="content">
            <p>Hey <strong>${safeName}</strong>,</p>
            <p>A fresh algorithmic challenge has landed on Quiz Platform! Ready to test your logic and solve it?</p>

            <div class="challenge-card">
              <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 900;">${safeTitle}</h2>
              <p style="margin: 0; font-size: 13px; color: #475569;">${safeDesc}</p>
              
              <div style="text-align: center; margin-top: 16px;">
                <a href="${targetUrl}" class="cta-btn">Solve Challenge Now →</a>
              </div>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">Quiz Platform Weekly Challenges Notification</p>
            <a href="${unsubscribeUrl}" style="color: #94a3b8; font-size: 11px;">Unsubscribe from challenge drops</a>
          </div>
        </div>
      </body>
    </html>
  `;

  return dispatchMail({
    to: email,
    subject,
    text: `New Challenge Dropped: ${safeTitle}\n\n${safeDesc}\n\nSolve it now: ${targetUrl}\n\nTo unsubscribe: ${unsubscribeUrl}`,
    html
  });
}
