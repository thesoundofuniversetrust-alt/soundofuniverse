// admin-data.js — stores site content in Netlify Blobs
// Falls back to a bundled default if no blob exists yet.
const { getStore } = require('@netlify/blobs');

global._tsuSessions = global._tsuSessions || {};

function auth(event) {
  const token = (event.headers['x-admin-token'] || '').trim();
  const s = global._tsuSessions[token];
  return s && Date.now() < s.expires;
}

const DEFAULT = {
  activities: [
    { id: 'education', title: 'Education & Scholarships', desc: 'Educational support and scholarships for poor and needy students.', photos: [] },
    { id: 'food',      title: 'Food, Clothing & Shelter',  desc: 'Food, clothing, shelter and basic necessities for the underprivileged.', photos: [] },
    { id: 'medical',   title: 'Medical Camps & Health',    desc: 'Medical camps, health awareness programmes and humanitarian services.', photos: [] },
    { id: 'environment', title: 'Environment & Tree Plantation', desc: 'Environmental protection, tree plantation and nature conservation.', photos: [] },
    { id: 'youth',     title: 'Youth & Social Awareness',  desc: 'Awareness programmes on education, health and social responsibility.', photos: [] }
  ],
  services: [
    { id: 'food-drive',   title: 'Food Packet Distribution Drive', desc: 'Our volunteers prepared hygienic food packets and handed them to families in need across Ranipet.', status: 'done',   location: 'Ranipet',         coverPhoto: 'assets/img/food_distrubution.png', actionLabel: 'View photos', actionLink: '#gallery' },
    { id: 'drawing',      title: 'Drawing Competition',            desc: 'A free drawing competition for children aged 3 to 18, in four age groups. Register your child online.', status: 'upcoming', location: 'Ranipet',         coverPhoto: 'assets/img/Drawing_competition_banner.png', actionLabel: 'Register now', actionLink: 'drawing-registration.html' },
    { id: 'medical-camp', title: 'Free Medical & Health Camp',     desc: 'Free health check-ups and awareness sessions with local doctors for villages around Ranipet.', status: 'upcoming', location: 'Ranipet villages', coverPhoto: 'assets/img/medical_camp.png', actionLabel: 'Support this', actionLink: '#donate' },
    { id: 'letter',       title: 'Letter Writing Competition',     desc: 'A free letter writing competition for students.', status: 'upcoming', location: 'Ranipet',         coverPhoto: 'assets/img/letter_writing.png', actionLabel: 'Support this', actionLink: '#donate' },
    { id: 'poetry',       title: 'Poetry Writing Competition',     desc: 'A free poetry writing competition for young writers.', status: 'upcoming', location: 'Ranipet',         coverPhoto: 'assets/img/poetry_writing.png', actionLabel: 'Support this', actionLink: '#donate' }
  ],
  logo: 'assets/img/logo.png'
};

async function getBlob() {
  try {
    const store = getStore('tsu-admin');
    const raw = await store.get('site-data');
    return raw ? JSON.parse(raw) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

async function setBlob(data) {
  const store = getStore('tsu-admin');
  await store.set('site-data', JSON.stringify(data));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    const data = await getBlob();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  }

  if (event.httpMethod === 'POST') {
    if (!auth(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    let body;
    try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Bad JSON' }; }
    const current = await getBlob();
    const updated = Object.assign({}, current, body);
    await setBlob(updated);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
