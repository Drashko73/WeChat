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
    subject: 'Welcome to WeChat!',
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
    subject: 'Your WeChat Verification Code',
    text: `Your WeChat verification code is: ${code}`,
    html
  };
  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendWelcomeEmail,
  sendVerificationCodeEmail
};
