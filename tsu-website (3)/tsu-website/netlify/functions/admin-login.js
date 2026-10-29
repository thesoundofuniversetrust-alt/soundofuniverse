const { Resend } = require('resend');
const crypto = require('crypto');

const OWNER_EMAIL = 'thesoundofuniversetrust@gmail.com';
const OWNER_PASS  = 'Gasvtrust@34';
const OTP_TTL     = 60 * 1000;
const SECRET      = process.env.SESSION_SECRET || 'tsu-secret-2026';

function signOtpToken(otp, expires) {
  const payload = otp + '|' + expires;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(payload + '|' + sig).toString('base64');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Bad JSON' };
  }

  const { email, password } = body;
  if (email !== OWNER_EMAIL || password !== OWNER_PASS) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + OTP_TTL;
  const otpToken = signOtpToken(otp, expires);

  // Try Resend
  let emailSent = false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: 'TSU Admin <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      subject: 'Your TSU Admin OTP',
      html: `<p>Your OTP: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p><p>Valid for 60 seconds.</p>`
    });
    if (result && result.id) emailSent = true;
    console.log('Resend:', JSON.stringify(result));
  } catch (err) {
    console.log('Resend error:', err.message);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, emailSent, otpToken, otp: emailSent ? undefined : otp })
  };
};
