const { Resend } = require('resend');

const OWNER_EMAIL = 'thesoundofuniversetrust@gmail.com';
const OWNER_PASS  = 'Gasvtrust@34';
const OTP_TTL     = 60 * 1000;
const RESEND_KEY  = process.env.RESEND_API_KEY;

// Use a simple fetch-based blob store as fallback
global._tsuOtp = global._tsuOtp || {};

async function storeOtp(otp, expires) {
  // Try Netlify Blobs first
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('tsu-admin');
    await store.set('otp', JSON.stringify({ otp, expires }));
    console.log('OTP stored in Netlify Blobs');
    return;
  } catch (e) {
    console.log('Blobs store failed:', e.message);
  }
  // Fallback: in-memory (works if same instance handles verify)
  global._tsuOtp = { otp, expires };
  console.log('OTP stored in memory');
}

exports.handler = async (event) => {
  console.log('admin-login called, method:', event.httpMethod);

  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch (e) {
    console.log('JSON parse error:', e.message);
    return { statusCode: 400, body: 'Bad JSON' };
  }

  const { email, password } = body;
  console.log('Login attempt for:', email);

  if (email !== OWNER_EMAIL || password !== OWNER_PASS) {
    console.log('Invalid credentials');
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + OTP_TTL;
  console.log('Generated OTP:', otp);

  await storeOtp(otp, expires);

  // Try Resend
  let emailSent = false;
  let resendError = null;
  try {
    console.log('Attempting Resend, API key present:', !!RESEND_KEY);
    const resend = new Resend(RESEND_KEY);
    const result = await resend.emails.send({
      from: 'TSU Admin <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      subject: 'Your TSU Admin OTP',
      html: `<p>Your OTP: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p><p>Valid for 60 seconds.</p>`
    });
    console.log('Resend result:', JSON.stringify(result));
    if (result && result.id) emailSent = true;
    else resendError = JSON.stringify(result);
  } catch (err) {
    resendError = err.message;
    console.log('Resend exception:', err.message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      emailSent,
      resendError,
      // Always return OTP for now until email is confirmed working
      otp
    })
  };
};
