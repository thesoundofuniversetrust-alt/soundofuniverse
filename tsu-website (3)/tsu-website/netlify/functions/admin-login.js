const { Resend } = require('resend');

const OWNER_EMAIL = 'thesoundofuniversetrust@gmail.com';
const OWNER_PASS  = 'Gasvtrust@34';

global._tsuOtp = global._tsuOtp || {};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const { email, password } = body;
  if (email !== OWNER_EMAIL || password !== OWNER_PASS) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 10 * 60 * 1000;
  global._tsuOtp[OWNER_EMAIL] = { otp, expires };

  // Try sending via Resend — if it fails (no verified domain), fall back to returning OTP directly
  let emailSent = false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: 'TSU Admin <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      subject: 'Your TSU Admin OTP',
      html: `<p>Your OTP is: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p><p>Valid for 10 minutes.</p>`
    });
    if (result && result.id) emailSent = true;
    console.log('Resend result:', JSON.stringify(result));
  } catch (err) {
    console.log('Resend error:', err.message);
  }

  // Return OTP in response if email could not be sent (no verified domain yet)
  // Once domain is verified in Resend, remove the `otp` field from this response
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      emailSent,
      // Temporary: show OTP directly since no verified domain yet
      otp: emailSent ? undefined : otp
    })
  };
};
