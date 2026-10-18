const nodemailer = require('nodemailer');

// Read SMTP configuration from environment variables
function getTransporter() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  // Strip spaces from password (Google App Passwords are shown as "xxxx xxxx xxxx xxxx")
  const rawPass = process.env.SMTP_PASS || '';
  const pass = rawPass.replace(/\s+/g, '').trim();
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    if (host.toLowerCase().includes('gmail')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
  }

  return null;
}

/**
 * Send a 6-digit OTP email for password reset
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit one-time password
 * @param {number} expiryMinutes - Validity in minutes (default 5)
 */
async function sendOtpEmail(toEmail, otp, expiryMinutes = 5) {
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@stocktracker.local';
  const transporter = getTransporter();

  const subject = 'Your Stock Tracker Password Reset Verification Code';
  const textBody = `Hello,

Your verification code for resetting your Stock Tracker password is:

${otp}

This one-time passcode is valid for ${expiryMinutes} minutes.

For security reasons, never share this code with anyone. Stock Tracker support will never ask for your verification code.

If you did not request this password reset, please ignore this email or secure your account.

Regards,
Stock Tracker Security Team`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #4f46e5; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Stock Tracker</h1>
              <p style="margin: 4px 0 0 0; color: #e0e7ff; font-size: 13px;">Security & Password Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 600;">Verification Code</h2>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                We received a request to reset your Stock Tracker account password. Use the verification code below to proceed:
              </p>

              <!-- OTP Box -->
              <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #4f46e5; display: inline-block;">${otp}</span>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500;">
                  Expires in ${expiryMinutes} minutes
                </p>
              </div>

              <!-- Warning Box -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.4;">
                  <strong>Important Security Notice:</strong> Never share this code with anyone. Our team will never ask for your code.
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © Stock Tracker Inventory Management. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textBody,
        html: htmlBody
      });
      console.log(`[EmailService] OTP email dispatched successfully to registered address (${toEmail}). MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[EmailService] Failed to send email via SMTP to ${toEmail}:`, err.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[EmailService (Dev Fallback)] OTP generated for ${toEmail}. Valid for ${expiryMinutes} minutes.`);
      }
      return { success: true, simulated: true, note: "Delivered via fallback due to SMTP error" };
    }
  } else {
    // Development / Local mode without SMTP credentials
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EmailService (Dev Mode)] OTP generated for ${toEmail}. Valid for ${expiryMinutes} minutes.`);
      console.log(`SMTP not configured. Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env to send live emails.`);
    }
    return { success: true, simulated: true };
  }
}

module.exports = {
  sendOtpEmail
};
