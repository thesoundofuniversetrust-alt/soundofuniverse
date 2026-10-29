const crypto = require('crypto');

const OWNER_EMAIL    = 'thesoundofuniversetrust@gmail.com';
const SECRET         = process.env.SESSION_SECRET || 'tsu-secret-2026';

global._tsuSessions = global._tsuSessions || {};

function verifyOtpToken(otpToken, submittedOtp) {
  try {
    const decoded = Buffer.from(otpToken, 'base64').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return { error: 'Invalid token' };
    const [storedOtp, expires, sig] = parts;
    const payload = storedOtp + '|' + expires;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return { error: 'Invalid token signature' };
    if (Date.now() > Number(expires)) return { error: 'OTP expired. Please login again.' };
    if (storedOtp !== String(submittedOtp).trim()) return { error: 'Incorrect OTP. Please try again.' };
    return { ok: true };
  } catch (e) {
    return { error: 'Token error: ' + e.message };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Bad JSON' };
  }

  const { otp, otpToken } = body;

  if (!otpToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Session lost. Please login again.' }) };
  }

  const result = verifyOtpToken(otpToken, otp);
  if (!result.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: result.error }) };
  }

  const token = crypto.createHmac('sha256', SECRET)
    .update(OWNER_EMAIL + Date.now())
    .digest('hex');

  global._tsuSessions[token] = { email: OWNER_EMAIL, expires: Date.now() + 4 * 60 * 60 * 1000 };

  return { statusCode: 200, body: JSON.stringify({ token }) };
};
