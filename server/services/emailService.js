import nodemailer from 'nodemailer';

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
 * Initializes and caches the Nodemailer transporter.
 * Supports:
 *  1. Gmail App Password (GMAIL_USER & GMAIL_APP_PASSWORD)
 *  2. Standard SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE)
 *  3. Fallback: Ethereal test mailbox or console logger for development
 */
export async function getTransporter() {
  if (transporter) return transporter;

  const {
    GMAIL_USER,
    GMAIL_APP_PASSWORD,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS
  } = process.env;

  // 1. Direct Gmail Configuration
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_USER.trim(),
          pass: GMAIL_APP_PASSWORD.trim()
        }
      });
      console.log('📧 [EmailService] Initialized Gmail transporter for', GMAIL_USER);
      return transporter;
    } catch (err) {
      console.error('❌ [EmailService] Failed to initialize Gmail transport:', err.message);
    }
  }

  // 2. Standard SMTP Server
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST.trim(),
        port: parseInt(SMTP_PORT, 10) || 587,
        secure: SMTP_SECURE === 'true' || SMTP_PORT === '465',
        auth: {
          user: SMTP_USER.trim(),
          pass: SMTP_PASS.trim()
        }
      });
      console.log(`📧 [EmailService] Initialized SMTP transporter (${SMTP_HOST}:${SMTP_PORT || 587})`);
      return transporter;
    } catch (err) {
      console.error('❌ [EmailService] Failed to initialize SMTP transport:', err.message);
    }
  }

  // 3. Fallback: Ethereal email test account for development
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
    return null;
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
  const targetRecipient = process.env.SUPPORT_EMAIL_TO || 'mohaamedtariq12@gmail.com';
  const mailTransporter = await getTransporter();

  const safeEmail = escapeHtml(email);
  const safeName = escapeHtml(name || 'Anonymous User');
  const safeSubject = escapeHtml(subject);
  const safeCategory = escapeHtml(category.toUpperCase());
  const safeUserId = escapeHtml(userId || 'Guest (Not logged in)');
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  const dateFormatted = new Date().toUTCString();

  const fromAddress = process.env.EMAIL_FROM || 
                      process.env.GMAIL_USER || 
                      process.env.SMTP_USER || 
                      '"Quiz Platform Support" <support@quizplatform.com>';

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
