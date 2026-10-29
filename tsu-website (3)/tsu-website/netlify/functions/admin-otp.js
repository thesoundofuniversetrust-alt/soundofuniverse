const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const OWNER_EMAIL   = 'thesoundofuniversetrust@gmail.com';
const SESSION_SECRET = process.env.SESSION_SECRET || 'tsu-secret-2026';

global._tsuSessions = global._tsuSessions || {};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const { otp } = body;

  // Read OTP from Netlify Blobs
  const store = getStore('tsu-admin');
  const raw = await store.get('otp');
  if (!raw) {
    return { statusCode: 401, body: JSON.stringify({ error: 'OTP not found. Please login again.' }) };
  }

  let record;
  try { record = JSON.parse(raw); } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid OTP data. Please login again.' }) };
  }

  if (record.otp !== String(otp).trim()) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect OTP' }) };
  }

  if (Date.now() > record.expires) {
    await store.delete('otp');
    return { statusCode: 401, body: JSON.stringify({ error: 'OTP expired. Please login again.' }) };
  }

  // Valid — delete OTP and create session
  await store.delete('otp');

  const token = crypto.createHmac('sha256', SESSION_SECRET)
    .update(OWNER_EMAIL + Date.now())
    .digest('hex');

  global._tsuSessions[token] = { email: OWNER_EMAIL, expires: Date.now() + 4 * 60 * 60 * 1000 };

  return { statusCode: 200, body: JSON.stringify({ token }) };
};
