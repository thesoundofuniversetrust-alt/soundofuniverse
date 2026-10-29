const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'tsu-secret-2026';

// Verify session token — same HMAC approach as admin-otp.js
function auth(event) {
  const token = (event.headers['x-admin-token'] || '').trim();
  if (!token) return false;
  // Token format: hmac hex (64 chars). We store valid tokens in a global with expiry.
  // Since functions share no memory, we re-verify by checking it's a valid HMAC of known prefix.
  // Simple approach: token is valid if it's 64 hex chars and was issued recently (we trust it if signed correctly).
  // We embed expiry in a separate header or just accept any valid-looking token for 4h window.
  // Best stateless approach: token = base64(email|expires|sig)
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return false;
    const [email, expires, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(email + '|' + expires).digest('hex');
    if (sig !== expectedSig) return false;
    if (Date.now() > Number(expires)) return false;
    return true;
  } catch { return false; }
}

const DEFAULT = {
  activities: [
    { id: 'education', title: 'Education & Scholarships', desc: 'Educational support and scholarships for poor and needy students.', color: 'purple', icon: 'i-cap', photos: [
      'assets/img/Education_img/schl_event/1.jpeg','assets/img/Education_img/schl_event/2.jpeg','assets/img/Education_img/schl_event/3.jpeg',
      'assets/img/Education_img/schl_event/4.jpeg','assets/img/Education_img/schl_event/5.jpeg','assets/img/Education_img/schl_event/6.jpeg',
      'assets/img/Education_img/schl_event/7.jpeg','assets/img/Education_img/schl_event/8.jpeg','assets/img/Education_img/schl_event/9.jpeg',
      'assets/img/Education_img/schl_event/10.jpeg','assets/img/Education_img/schl_event/11.jpeg','assets/img/Education_img/schl_event/12.jpeg',
      'assets/img/Education_img/schl_event/13.jpeg','assets/img/Education_img/schl_event/14.jpeg','assets/img/Education_img/schl_event/15.jpeg',
      'assets/img/Education_img/schl_event/16.jpeg','assets/img/Education_img/schl_event/17.jpeg','assets/img/Education_img/schl_event/18.jpeg',
      'assets/img/Education_img/schl_event/19.jpeg','assets/img/Education_img/schl_event/20.jpeg','assets/img/Education_img/schl_event/21.jpeg',
      'assets/img/Education_img/schl_event/22.jpeg','assets/img/Education_img/schl_event/23.jpeg','assets/img/Education_img/schl_event/24.jpeg',
      'assets/img/Education_img/schl_event/25.jpeg','assets/img/Education_img/schl_event/26.jpeg','assets/img/Education_img/schl_event/27.jpeg',
      'assets/img/Education_img/schl_event/28.jpeg','assets/img/Education_img/schl_event/29.jpeg','assets/img/Education_img/schl_event/30.jpeg',
      'assets/img/Education_img/schl_event/31.jpeg','assets/img/Education_img/schl_event/32.jpeg','assets/img/Education_img/schl_event/33.jpeg',
      'assets/img/Education_img/schl_event/34.jpeg','assets/img/Education_img/schl_event/35.jpeg','assets/img/Education_img/schl_event/36.jpeg',
      'assets/img/Education_img/schl_event/37.jpeg','assets/img/Education_img/schl_event/38.jpeg','assets/img/Education_img/schl_event/39.jpeg',
      'assets/img/Education_img/schl_event/40.jpeg','assets/img/Education_img/schl_event/41.jpeg','assets/img/Education_img/schl_event/42.jpeg',
      'assets/img/Education_img/schl_event/43.jpeg','assets/img/Education_img/schl_event/44.jpeg','assets/img/Education_img/schl_event/45.jpeg',
      'assets/img/Education_img/schl_event/46.jpeg','assets/img/Education_img/schl_event/47.jpeg','assets/img/Education_img/schl_event/48.jpeg',
      'assets/img/Education_img/schl_event/49.jpeg','assets/img/Education_img/schl_event/50.jpeg','assets/img/Education_img/schl_event/51.jpeg'
    ] },
    { id: 'food',        title: 'Food, Clothing & Shelter',       desc: 'Food, clothing, shelter and basic necessities for the underprivileged.', color: 'magenta', icon: 'i-utensils', photos: [] },
    { id: 'medical',     title: 'Medical Camps & Health',          desc: 'Medical camps, health awareness programmes and humanitarian services.', color: 'sky', icon: 'i-steth', photos: [] },
    { id: 'environment', title: 'Environment & Tree Plantation',   desc: 'Environmental protection, tree plantation and nature conservation.', color: 'green', icon: 'i-sprout', photos: [] },
    { id: 'youth',       title: 'Youth & Social Awareness',        desc: 'Awareness programmes on education, health and social responsibility.', color: 'purple', icon: 'i-megaphone', photos: [] }
  ],
  services: [
    { id: 'food-drive',   title: 'Food Packet Distribution Drive', desc: 'Our volunteers prepared hygienic food packets and handed them to families in need across Ranipet.', status: 'done',     location: 'Ranipet',         coverPhoto: 'assets/img/food_distrubution.png',          actionLabel: 'View photos',  actionLink: '#gallery' },
    { id: 'drawing',      title: 'Drawing Competition',            desc: 'A free drawing competition for children aged 3 to 18, in four age groups.', status: 'upcoming', location: 'Ranipet',         coverPhoto: 'assets/img/Drawing_competition_banner.png', actionLabel: 'Register now', actionLink: 'drawing-registration.html' },
    { id: 'medical-camp', title: 'Free Medical & Health Camp',     desc: 'Free health check-ups and awareness sessions with local doctors for villages around Ranipet.', status: 'upcoming', location: 'Ranipet villages', coverPhoto: 'assets/img/medical_camp.png',               actionLabel: 'Support this', actionLink: '#donate' },
    { id: 'letter',       title: 'Letter Writing Competition',     desc: 'A free letter writing competition for students.', status: 'upcoming', location: 'Ranipet',         coverPhoto: 'assets/img/letter_writing.png',             actionLabel: 'Support this', actionLink: '#donate' },
    { id: 'poetry',       title: 'Poetry Writing Competition',     desc: 'A free poetry writing competition for young writers.', status: 'upcoming', location: 'Ranipet',         coverPhoto: 'assets/img/poetry_writing.png',             actionLabel: 'Support this', actionLink: '#donate' }
  ],
  gallery: [],
  logo: 'assets/img/logo.png'
};

async function getBlob() {
  try {
    const store = getStore('tsu-admin');
    const raw = await store.get('site-data');
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('Loaded from Blobs, keys:', Object.keys(parsed));
      return parsed;
    }
  } catch (e) { console.log('getBlob error:', e.message); }
  return DEFAULT;
}

async function setBlob(data) {
  try {
    const store = getStore('tsu-admin');
    await store.set('site-data', JSON.stringify(data));
    console.log('Saved to Blobs OK');
  } catch (e) {
    console.log('setBlob error:', e.message);
    throw e;
  }
}

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (event.httpMethod === 'GET') {
    if (event.queryStringParameters && event.queryStringParameters.reset === '1') {
      try { const store = getStore('tsu-admin'); await store.delete('site-data'); console.log('Reset done'); } catch (e) { console.log('Reset error:', e.message); }
    }
    const data = await getBlob();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  if (event.httpMethod === 'POST') {
    const isAuth = auth(event);
    console.log('POST auth result:', isAuth, 'token present:', !!(event.headers['x-admin-token']));
    if (!isAuth) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    let body;
    try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers, body: 'Bad JSON' }; }
    const current = await getBlob();
    const updated = Object.assign({}, current, body);
    await setBlob(updated);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
