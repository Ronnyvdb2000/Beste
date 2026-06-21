const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOrderMail(to, subject, text) {
  await transporter.sendMail({
    from: `"Bestellingen" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text
  });
}

module.exports = { sendOrderMail };
