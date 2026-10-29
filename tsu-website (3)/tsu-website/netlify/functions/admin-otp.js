const crypto = require('crypto');

const OWNER_EMAIL = 'thesoundofuniversetrust@gmail.com';
const SESSION_SECRET = process.env.SESSION_SECRET || 'tsu-secret-2026';

global._tsuOtp      = global._tsuOtp      || {};
global._tsuSessions = global._tsuSessions || {};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const { otp } = body;
  const record = global._tsuOtp[OWNER_EMAIL];

  if (!record || record.otp !== String(otp) || Date.now() > record.expires) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired OTP' }) };
  }

  delete global._tsuOtp[OWNER_EMAIL];

  const token = crypto.createHmac('sha256', SESSION_SECRET)
    .update(OWNER_EMAIL + Date.now())
    .digest('hex');

  global._tsuSessions[token] = { email: OWNER_EMAIL, expires: Date.now() + 4 * 60 * 60 * 1000 };

  return { statusCode: 200, body: JSON.stringify({ token }) };
};
