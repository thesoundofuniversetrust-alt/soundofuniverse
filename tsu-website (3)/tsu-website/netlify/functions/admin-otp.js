const crypto = require('crypto');

const OWNER_EMAIL    = 'thesoundofuniversetrust@gmail.com';
const SESSION_SECRET = process.env.SESSION_SECRET || 'tsu-secret-2026';

global._tsuOtp      = global._tsuOtp      || {};
global._tsuSessions = global._tsuSessions || {};

async function getOtp() {
  // Try Netlify Blobs first
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('tsu-admin');
    const raw = await store.get('otp');
    if (raw) {
      console.log('OTP read from Netlify Blobs');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.log('Blobs read failed:', e.message);
  }
  // Fallback: memory
  if (global._tsuOtp && global._tsuOtp.otp) {
    console.log('OTP read from memory');
    return global._tsuOtp;
  }
  return null;
}

async function deleteOtp() {
  try {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('tsu-admin');
    await store.delete('otp');
  } catch (e) { /* ignore */ }
  global._tsuOtp = {};
}

exports.handler = async (event) => {
  console.log('admin-otp called');
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Bad JSON' };
  }

  const { otp } = body;
  console.log('Verifying OTP:', otp);

  const record = await getOtp();
  console.log('Stored record:', JSON.stringify(record));

  if (!record) {
    return { statusCode: 401, body: JSON.stringify({ error: 'OTP not found. Please login again.' }) };
  }

  if (record.otp !== String(otp).trim()) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect OTP. Please try again.' }) };
  }

  if (Date.now() > record.expires) {
    await deleteOtp();
    return { statusCode: 401, body: JSON.stringify({ error: 'OTP expired. Please login again.' }) };
  }

  await deleteOtp();

  const token = crypto.createHmac('sha256', SESSION_SECRET)
    .update(OWNER_EMAIL + Date.now())
    .digest('hex');

  global._tsuSessions[token] = { email: OWNER_EMAIL, expires: Date.now() + 4 * 60 * 60 * 1000 };
  console.log('Session created:', token.substring(0, 8) + '...');

  return { statusCode: 200, body: JSON.stringify({ token }) };
};
