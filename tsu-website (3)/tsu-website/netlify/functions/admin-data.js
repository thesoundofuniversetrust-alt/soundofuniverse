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
    { id: 'food',      title: 'Food, Clothing & Shelter',  desc: 'Food, clothing, shelter and basic necessities for the underprivileged.', color: 'magenta', icon: 'i-utensils', photos: [] },
    { id: 'medical',   title: 'Medical Camps & Health',    desc: 'Medical camps, health awareness programmes and humanitarian services.', color: 'sky', icon: 'i-steth', photos: [] },
    { id: 'environment', title: 'Environment & Tree Plantation', desc: 'Environmental protection, tree plantation and nature conservation.', color: 'green', icon: 'i-sprout', photos: [] },
    { id: 'youth',     title: 'Youth & Social Awareness',  desc: 'Awareness programmes on education, health and social responsibility.', color: 'purple', icon: 'i-megaphone', photos: [] }
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
    // ?reset=1 forces re-seed from DEFAULT (use once to fix stale data)
    if (event.queryStringParameters && event.queryStringParameters.reset === '1') {
      try { const store = getStore('tsu-admin'); await store.delete('site-data'); } catch {}
    }
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
