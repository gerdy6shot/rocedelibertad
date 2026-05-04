const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);
  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  const { getStore } = await import('@netlify/blobs');
  const store = getStore('verification-codes');
  await store.set(email, JSON.stringify({ otp, expiresAt }));

  const magicLink = `https://rocedelibertad.com/verify?email=${encodeURIComponent(email)}&token=${otp}`;

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0A0B0B; padding: 40px 30px; border: 1px solid #B38E5D;">
        <h1 style="color: #B38E5D; font-size: 24px; text-transform: uppercase;">Roce de Libertad</h1>
        <p style="color: #F2EBE3;">Ancestral Mezcal · Batch 001</p>
        <hr style="border-color: #B38E5D;">
        <h2 style="color: #F2EBE3;">Secure Your Allocation</h2>
        <p style="color: #F2EBE3;">Click the button below to verify and access the investor portal:</p>
        <a href="${magicLink}" style="display: inline-block; background: #B38E5D; color: #0A0B0B; text-decoration: none; padding: 12px 24px; margin: 20px 0; font-weight: bold; text-transform: uppercase;">🔒 Secure Your Allocation →</a>
        <p style="color: #F2EBE3;">Or enter this code: <strong>${otp}</strong></p>
        <p style="color: #F2EBE3; font-size: 12px;">Valid for 10 minutes.</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'verification@rocedelibertad.com',
      to: email,
      subject: 'Secure Your Roce de Libertad Allocation',
      html,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Code sent' })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' })
    };
  }
};
