const crypto = require('crypto');
const https = require('https');

const SECRET = process.env.SESSION_SECRET || 'tsu-owner-secret-2025';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// public_id stored in Cloudinary (no extension — Cloudinary raw assets don't need one)
const MANIFEST_PUBLIC_ID = 'tsu-data';

// Delivery URL — Cloudinary raw assets are served at this path
// Cache-bust with timestamp so we always get the latest version
function manifestUrl() {
  return `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${MANIFEST_PUBLIC_ID}?_cb=${Date.now()}`;
}

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

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// Upload the JSON manifest as a Cloudinary RAW asset.
// Cloudinary Upload API signature rules:
//   - Sort all signed params alphabetically by key
//   - Concatenate as key=value&key=value (no URL encoding)
//   - Append the API secret directly (no separator)
//   - SHA-1 hash the result
// resource_type is a URL path segment, NOT a signed parameter.
function uploadManifest(jsonString) {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return reject(new Error('Cloudinary env vars not set'));
    }

    const timestamp = Math.round(Date.now() / 1000);

    // Params to sign — alphabetical order, resource_type excluded (it's in the URL)
    const sigParams = {
      invalidate: 'true',
      overwrite: 'true',
      public_id: MANIFEST_PUBLIC_ID,
      timestamp: String(timestamp)
    };
    const sigStr = Object.keys(sigParams).sort()
      .map(k => `${k}=${sigParams[k]}`)
      .join('&') + API_SECRET;
    const signature = crypto.createHash('sha1').update(sigStr).digest('hex');

    const boundary = '----TSUBoundary' + Date.now();
    const fileContent = Buffer.from(jsonString, 'utf8');

    const fields = [
      ['public_id', MANIFEST_PUBLIC_ID],
      ['overwrite', 'true'],
      ['invalidate', 'true'],
      ['timestamp', String(timestamp)],
      ['api_key', API_KEY],
      ['signature', signature]
    ];

    const parts = [];
    fields.forEach(([name, value]) => {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
        'utf8'
      ));
    });
    // File field
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="tsu-data.json"\r\nContent-Type: application/json\r\n\r\n`,
      'utf8'
    ));
    parts.push(fileContent);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));

    const body = Buffer.concat(parts);

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/raw/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(raw);
          if (result.error) return reject(new Error(result.error.message));
          resolve(result);
        } catch (e) { reject(new Error('Bad response from Cloudinary: ' + raw.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getDefault() {
  return {
    activities: [
      { id: 'education', title: 'Education & Scholarships', desc: 'Educational support and scholarships for poor and needy students.', color: 'purple', icon: 'i-cap', logo: '', photos: [
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
      ]},
      { id: 'food',        title: 'Food, Clothing & Shelter',     desc: 'Food, clothing, shelter and basic necessities for the underprivileged.', color: 'magenta', icon: 'i-utensils', logo: '', photos: [] },
      { id: 'medical',     title: 'Medical Camps & Health',        desc: 'Medical camps, health awareness programmes and humanitarian services.', color: 'sky', icon: 'i-steth', logo: '', photos: [] },
      { id: 'environment', title: 'Environment & Tree Plantation', desc: 'Environmental protection, tree plantation and nature conservation.', color: 'green', icon: 'i-sprout', logo: '', photos: [] },
      { id: 'youth',       title: 'Youth & Social Awareness',      desc: 'Awareness programmes on education, health and social responsibility.', color: 'purple', icon: 'i-megaphone', logo: '', photos: [] }
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
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod === 'GET') {
    const data = await fetchJson(manifestUrl());
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || getDefault())
    };
  }

  if (event.httpMethod === 'POST') {
    if (!auth(event)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
    let body;
    try { body = JSON.parse(event.body); }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad JSON' }) }; }

    const current = await fetchJson(manifestUrl()) || getDefault();
    const updated = Object.assign({}, current, body);

    try {
      await uploadManifest(JSON.stringify(updated));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      console.error('Manifest upload error:', e.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to save: ' + e.message }) };
    }
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
};
