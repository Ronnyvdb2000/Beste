const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  auth: {
    user: 'jouw_email@example.com',
    pass: 'jouw_wachtwoord'
  }
});

async function sendOrderMail(to, subject, text) {
  await transporter.sendMail({
    from: '"Bestellingen" <jouw_email@example.com>',
    to,
    subject,
    text
  });
}

module.exports = { sendOrderMail };
