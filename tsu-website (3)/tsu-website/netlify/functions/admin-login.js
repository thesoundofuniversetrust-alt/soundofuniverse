const { Resend } = require('resend');

const OWNER_EMAIL = 'thesoundofuniversetrust@gmail.com';
const OWNER_PASS  = 'Gasvtrust@34';

// In-memory OTP store (fine for single-instance Netlify functions)
// We use a global so it persists within the same warm instance
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
  const expires = Date.now() + 10 * 60 * 1000; // 10 min
  global._tsuOtp[OWNER_EMAIL] = { otp, expires };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const sendResult = await resend.emails.send({
    from: 'TSU Admin <onboarding@resend.dev>',
    to: OWNER_EMAIL,
    subject: 'Your TSU Admin OTP',
    html: `<p>Your one-time password is: <strong style="font-size:24px;letter-spacing:4px">${otp}</strong></p><p>Valid for 10 minutes.</p>`
  });
  console.log('Resend result:', JSON.stringify(sendResult));

  return { statusCode: 200, body: JSON.stringify({ ok: true, debug: sendResult }) };
};
