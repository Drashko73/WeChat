const nodemailer = require('nodemailer');
const config = require('../common/config');
const fs = require('fs');
const path = require('path');

// Configure your SMTP transport here
const transporter = nodemailer.createTransport({
  // Example for Gmail. Replace with your SMTP provider details.
  service: 'gmail',
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
});

async function sendWelcomeEmail(email, fullName) {
  // Load and process the HTML template
  const templatePath = path.join(__dirname, '../templates/welcome_email.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  
  html = html.replace(/{{FULLNAME}}/g, fullName)
    .replace(/{{COPYRIGHT_YEAR}}/g, new Date().getFullYear())
    .replace(/{{VERIFICATION_LINK}}/g, config.FRONTEND_VERIFICATION_URL);

  const mailOptions = {
    from: config.SMTP_USER,
    to: email,
    subject: '(no-reply) Welcome to WeChat!',
    text: `Hello ${fullName},\n\nWelcome to WeChat! We are glad to have you on board.`,
    html
  };
  await transporter.sendMail(mailOptions);
}

async function sendVerificationCodeEmail(email, code) {
  const templatePath = path.join(__dirname, '../templates/verification_code_email.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace('{{code}}', code).replace('{{year}}', new Date().getFullYear());

  const mailOptions = {
    from: config.SMTP_USER,
    to: email,
    subject: '(no-reply) Your WeChat Verification Code',
    text: `Your WeChat verification code is: ${code}`,
    html
  };
  await transporter.sendMail(mailOptions);
}

async function sendEmailConfirmationEmail(email, fullName) {
  const templatePath = path.join(__dirname, '../templates/successful_email_confirmation.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  
  html = html.replace(/{{FULLNAME}}/g, fullName)
    .replace(/{{COPYRIGHT_YEAR}}/g, new Date().getFullYear())
    .replace(/{{LOGIN_LINK}}/g, config.FRONTEND_LOGIN_URL);

  const mailOptions = {
    from: config.SMTP_USER,
    to: email,
    subject: '(no-reply) Successfully Confirmed Email Address',
    text: `Hello ${fullName},\n\nYour email address has been confirmed.`,
    html
  };
  await transporter.sendMail(mailOptions);
}

async function sendPasswordResetCodeEmail(email, code, expirationMinutes) {
  const templatePath = path.join(__dirname, '../templates/password_reset_code_email.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  
  html = html.replace(/{{code}}/g, code)
       .replace(/{{year}}/g, new Date().getFullYear())
       .replace(/{{expirationMinutes}}/g, expirationMinutes);

  const mailOptions = {
    from: config.SMTP_USER,
    to: email,
    subject: '(no-reply) WeChat Password Reset Code',
    text: `Your WeChat password reset code is: ${code}. This code will expire in ${expirationMinutes} minutes.`,
    html
  };
  await transporter.sendMail(mailOptions);
}

async function sendPasswordChangedEmail(email, fullName) {
  const mailOptions = {
    from: config.SMTP_USER,
    to: email,
    subject: '(no-reply) Your WeChat Password Has Been Changed',
    text: `Hello ${fullName},\n\nYour WeChat password has been successfully changed. If you did not make this change, please contact support immediately.`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Password Changed</h2>
      <p>Hello ${fullName},</p>
      <p>Your WeChat password has been successfully changed.</p>
      <p><strong>Important:</strong> If you did not make this change, please contact support immediately.</p>
      <p>Thank you,<br>The WeChat Team</p>
      <div style="margin-top: 20px; font-size: 12px; color: #666;">
        <p>&copy; ${new Date().getFullYear()} WeChat. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
    `
  };
  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendWelcomeEmail,
  sendVerificationCodeEmail,
  sendEmailConfirmationEmail,
  sendPasswordResetCodeEmail,
  sendPasswordChangedEmail
};
