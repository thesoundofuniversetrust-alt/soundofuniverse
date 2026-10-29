const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'tsu-secret-2026';

function auth(event) {
  const token = (event.headers['x-admin-token'] || '').trim();
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return false;
    const [email, expires, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(email + '|' + expires).digest('hex');
    return sig === expectedSig && Date.now() < Number(expires);
  } catch { return false; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!auth(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const { folder = 'tsu' } = body;
  const timestamp = Math.round(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  const str = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(str).digest('hex');

  return {
    statusCode: 200,
    body: JSON.stringify({ timestamp, signature, apiKey, cloudName, folder })
  };
};
