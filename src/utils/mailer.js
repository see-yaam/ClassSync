const nodemailer = require('nodemailer');

const getTransporter = () => {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
};


/**
 * Sends OTP Email via Gmail SMTP
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} purpose - 'registration' or 'password_reset'
 */
async function sendOTPEmail(toEmail, otpCode, purpose = 'registration') {
  let subject = 'ClassSync — Account Verification OTP';
  let actionText = 'complete your account action';

  if (purpose === 'registration') {
    subject = 'ClassSync — Verify Your Account OTP';
    actionText = 'complete your account registration';
  } else if (purpose === 'password_reset') {
    subject = 'ClassSync — Password Reset OTP';
    actionText = 'reset your account password';
  } else if (purpose === 'email_change') {
    subject = 'ClassSync — Verify New Email Address OTP';
    actionText = 'verify and update your new email address';
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; text-align: center;">📚 ClassSync</h2>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">
      <p>Hello,</p>
      <p>Please use the following 6-digit verification code to ${actionText}:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 6px; display: inline-block;">
          ${otpCode}
        </span>
      </div>
      <p style="font-size: 13px; color: #64748b;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"ClassSync" <${(process.env.EMAIL_USER || '').trim()}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent
    });

    console.log(`✉️ OTP Email sent successfully to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${toEmail}:`, error.message);
    // Fallback: log to console so testing is never blocked
    console.log(`[CONSOLE FALLBACK OTP for ${toEmail}]: ${otpCode}`);
    return { success: false, error: error.message };
  }
}

module.exports = { sendOTPEmail };
