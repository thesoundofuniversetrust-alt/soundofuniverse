const { Resend } = require('resend');
const { getStore } = require('@netlify/blobs');

const OWNER_EMAIL = 'thesoundofuniversetrust@gmail.com';
const OWNER_PASS  = 'Gasvtrust@34';
const OTP_TTL     = 60 * 1000; // 60 seconds

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const { email, password } = body;
  if (email !== OWNER_EMAIL || password !== OWNER_PASS) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + OTP_TTL;

  // Store OTP in Netlify Blobs so it persists across function instances
  const store = getStore('tsu-admin');
  await store.set('otp', JSON.stringify({ otp, expires }));

  // Try sending via Resend
  let emailSent = false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: 'TSU Admin <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      subject: 'Your TSU Admin OTP',
      html: `<p>Your OTP is: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p><p>Valid for 60 seconds.</p>`
    });
    if (result && result.id) emailSent = true;
  } catch (err) {
    console.log('Resend error:', err.message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      emailSent,
      otp: emailSent ? undefined : otp
    })
  };
};
