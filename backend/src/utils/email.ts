import * as nodemailer from 'nodemailer';

// BDDEL HADO B L-INFO DYALEK (Exemple b Gmail)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Zid hado f .env
    pass: process.env.EMAIL_PASS, // Zid hado f .env
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: '"Urba Backoffice" <no-reply@urbagroupe.ma>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`✅ Email sent: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ Error sending email: ${error}`);
  }
};