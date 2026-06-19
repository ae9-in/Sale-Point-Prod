const { BrevoClient } = require('@getbrevo/brevo');

const client = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY
});

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const response = await client.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html,
      textContent: text,
      sender: { 
        name: "Sales Point System", 
        email: process.env.SMTP_FROM || "jishnunreddy9010@gmail.com" 
      },
      to: [{ email: to }]
    });
    console.log('Email sent successfully via Brevo API:', response.messageId);
    return response;
  } catch (error) {
    console.error('Failed to send email via Brevo API:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
};
