const nodemailer = require('nodemailer');

// For development, you can use Ethereal (fake SMTP) or actual SMTP credentials.
// Replace host/port/auth with your SMTP provider (e.g., SendGrid, AWS SES, Gmail) when going live.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER || 'your_smtp_user',
    pass: process.env.SMTP_PASS || 'your_smtp_password'
  }
});

// 1. Send Welcome Email
async function sendWelcomeEmail(toEmail, fullName) {
  const mailOptions = {
    from: '"Meridian Markets" <no-reply@meridianmarkets.com>',
    to: toEmail,
    subject: 'Welcome to Meridian Markets 🚀',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 40px; border-radius: 8px;">
        <h2 style="color: #00f2fe;">Welcome aboard, ${fullName}!</h2>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Your Meridian Markets account has been created successfully. You now have full access to institutional liquidity, low-latency execution, and our multi-asset trading terminal.
        </p>
        <div style="margin: 30px 0; padding: 15px; background-color: #0f172a; border-left: 4px solid #00f2fe; border-radius: 4px;">
          <strong style="color: #4ade80;">Account Status:</strong> Active (Demo Liquidity Enabled)
        </div>
        <p style="color: #64748b; font-size: 13px;">If you did not request this account creation, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ WELCOME EMAIL SENT to ${toEmail} | ID: ${info.messageId}`);
  } catch (err) {
    console.error('❌ Error sending welcome email:', err.message);
  }
}

// 2. Send Password Reset Email
async function sendPasswordResetEmail(toEmail, resetToken) {
  const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: '"Meridian Markets Security" <security@meridianmarkets.com>',
    to: toEmail,
    subject: 'Password Reset Request 🔒',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 40px; border-radius: 8px;">
        <h2 style="color: #f87171;">Reset Your Password</h2>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          We received a request to reset the password for your Meridian Markets account. Click the button below to specify a new password:
        </p>
        <div style="margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #020617; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">
          Or copy and paste this link into your browser:<br />
          <span style="color: #38bdf8;">${resetLink}</span>
        </p>
        <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
          This token is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`🔑 RESET EMAIL SENT to ${toEmail} | ID: ${info.messageId}`);
  } catch (err) {
    console.error('❌ Error sending reset email:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };