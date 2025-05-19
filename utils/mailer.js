// utils/mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Optional: verify connection at startup
transporter.verify()
  .then(() => console.log('📧 Mailer ready\n\n\n\n'))
  .catch(err => console.error('❌ Mailer setup error:', err));

module.exports = transporter;
