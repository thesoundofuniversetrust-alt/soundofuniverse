/**
 * Drawing Competition registrations → Google Sheet
 * (one tab per listed school, plus one "Others" tab for every other school).
 *
 * SETUP (one time, done by the trust's owner account):
 *   1. Create a new Google Sheet, e.g. "Drawing Competition Registrations".
 *      Keep it private (do not share it) — only the owner can see it.
 *   2. In that sheet: Extensions → Apps Script. Delete what is there and paste this whole file. Save.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      Click Deploy, allow the permissions, and copy the "Web app URL" (ends in /exec).
 *   4. Paste that URL into SHEET_URL near the bottom of tsu-website/drawing-registration.html.
 *
 * "Anyone" only lets the website SEND a registration to this script.
 * Nobody can read the sheet through it — the sheet stays visible to the owner only.
 *
 * If you edit this script later: Deploy → Manage deployments → Edit (pencil) →
 * Version: "New version" → Deploy. The URL stays the same.
 */

/* Schools in the website's dropdown — each gets its own tab.
   Keep this list the SAME as SCHOOLS in tsu-website/drawing-registration.html.
   Any school not in this list (the "Others" option) is saved in one "Others" tab. */
var SCHOOLS = [
  'Vedavalli Vidyalaya',
  'Bharathidhasanar Matric Hr Sec School',
  'Sri Ramakrishna Matric Higher Secondary School',
  'D.A.V. BHEL School',
  'The Krisar Academy',
  'Selvam Matric Higher Secondary School',
  'V.K.V. Matriculation School',
  'Gangadara Matriculation Higher Secondary School',
  'V.R.V. Ladies Higher Secondary School',
  'Little Flower Convent',
  'Government Girls Higher Secondary School',
  'Government ADW Higher Secondary School',
  'Goodlet Higher Secondary School',
  'Islamiah Boys Higher Secondary School',
  'Little Flower (L.F.C.) Girls Higher Secondary School',
  'Sri Ramakrishna BHEL Higher Secondary School',
  'Government Higher Secondary School'
];

var OTHERS_TAB = 'Others';
var CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
var HEADERS = ['Registered At', 'Participant Name', 'Age', 'Category', 'Class', 'School', 'Phone', 'Email'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var d = JSON.parse(e.postData.contents);
    var name    = clean_(d.name, 100);
    var age     = parseInt(d.age, 10);
    var school  = clean_(d.school, 120);
    var cls     = String(d.cls || '');
    var phone   = String(d.phone || '').replace(/\D/g, '').slice(-10);
    var email   = clean_(d.email, 120);

    if (name.length < 2 || school.length < 2 || isNaN(age) || age < 3 || age > 18 ||
        CLASSES.indexOf(cls) === -1 || !/^[6-9]\d{9}$/.test(phone)) {
      return json_({ ok: false, error: 'invalid' });
    }

    // Listed school → its own tab. "Others" (or anything not on the list) → one "Others" tab.
    var listed = !d.other && SCHOOLS.some(function (s) { return clean_(s, 120) === school; });
    var sheet = sheetFor_(listed ? school : OTHERS_TAB);
    sheet.appendRow([new Date(), name, age, categoryFor_(age), cls, school, phone, email]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

/** Finds the tab with this name (ignoring case and extra spaces), or creates it. */
function sheetFor_(tabName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var title = tabTitle_(tabName);
  var key = title.toLowerCase();

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase() === key) return sheets[i];
  }

  var sheet = ss.insertSheet(title);
  sheet.appendRow(HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#F4EFE0');
  sheet.setFrozenRows(1);

  // Remove the empty default "Sheet1" once real school tabs exist.
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  return sheet;
}

/** Keeps the school name as written, minus characters Google doesn't allow in tab names. */
function tabTitle_(name) {
  var t = name.replace(/[\[\]\*\?\/\\:]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.slice(0, 90) || OTHERS_TAB;
}

function categoryFor_(age) {
  return age <= 6 ? 'Group A (3–6 yrs)'
       : age <= 10 ? 'Group B (7–10 yrs)'
       : age <= 14 ? 'Group C (11–14 yrs)'
       : 'Group D (15–18 yrs)';
}

/** Trims, limits length, and stops text like "=HYPERLINK(...)" being run as a formula. */
function clean_(v, max) {
  var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
