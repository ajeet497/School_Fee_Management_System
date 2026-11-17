
const nodemailer = require("nodemailer");

// Check SMTP configuration
console.log("SMTP configuration check:", {
  hostLoaded: Boolean(process.env.BREVO_SMTP_HOST),
  userLoaded: Boolean(process.env.BREVO_SMTP_USER),
  passLoaded: Boolean(process.env.BREVO_SMTP_PASS),
  passLength: process.env.BREVO_SMTP_PASS?.length,
});

// Create Brevo SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false, // Use STARTTLS on port 587
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

// Send an email
async function sendEmail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: {
      name: "School Management System",
      address: process.env.BREVO_SENDER_EMAIL,
    },
    to,
    subject,
    text,
    html,
  });
}

// Verify SMTP connection
async function verifySmtpConnection() {
  return transporter.verify();
}

// Export both functions
module.exports = {
  sendEmail,
  verifySmtpConnection,
};
