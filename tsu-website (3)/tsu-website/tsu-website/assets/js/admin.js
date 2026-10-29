(function () {
  'use strict';

  var API = '/api';
  var token = sessionStorage.getItem('tsu-admin-token') || '';
  var otpToken = '';
  var siteData = { activities: [], services: [], logo: 'assets/img/logo.png' };
  var editingActIdx = -1;
  var editingSvcIdx = -1;
  var actPhotos = []; // working copy of photos for current modal

  function $(s, c) { return (c || document).querySelector(s); }
  function screen(id) {
    ['screen-login','screen-otp','screen-dash'].forEach(function(s){
      document.getElementById(s).hidden = s !== id;
    });
  }
  var toastEl = $('#admin-toast'), toastT;
  function toast(msg, err) {
    toastEl.textContent = msg;
    toastEl.style.background = err ? '#B42318' : '#212C5C';
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function(){ toastEl.classList.remove('is-on'); }, 3200);
  }
  function setLoading(btn, on) {
    if (on) { btn.dataset.txt = btn.textContent; btn.innerHTML = '<span class="spinner"></span>'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.txt || 'Save'; btn.disabled = false; }
  }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Login ── */
  $('#login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = $('#login-btn'), err = $('#login-err');
    err.textContent = ''; setLoading(btn, true);
    try {
      var r = await fetch(API+'/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: $('#l-email').value.trim(), password: $('#l-pass').value }) });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Login failed');
      otpToken = d.otpToken || '';
      screen('screen-otp');
      // Never show OTP on screen — only sent to email
      $('#otp-hint').textContent = 'A 6-digit code has been sent to your email. Valid for 60 seconds.';
      $('#l-otp').focus();
    } catch(ex) { err.textContent = ex.message; }
    finally { setLoading(btn, false); }
  });

  /* ── OTP ── */
  $('#otp-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = $('#otp-btn'), err = $('#otp-err');
    err.textContent = ''; setLoading(btn, true);
    try {
      var r = await fetch(API+'/admin-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ otp: $('#l-otp').value.trim(), otpToken: otpToken }) });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Invalid OTP');
      token = d.token;
      sessionStorage.setItem('tsu-admin-token', token);
      await loadData();
      screen('screen-dash');
    } catch(ex) { err.textContent = ex.message; }
    finally { setLoading(btn, false); }
  });

  /* ── Logout ── */
  $('#logout-btn').addEventListener('click', function() {
    sessionStorage.removeItem('tsu-admin-token'); token = ''; screen('screen-login');
  });

  /* ── Tabs ── */
  document.querySelectorAll('.dash-nav__btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.dash-nav__btn').forEach(function(b){ b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      document.querySelectorAll('.tab-panel').forEach(function(p){ p.hidden = true; });
      document.getElementById('tab-'+btn.dataset.tab).hidden = false;
    });
  });

  /* ── Load / Save ── */
  async function loadData() {
    var r = await fetch(API+'/admin-data');
    siteData = await r.json();
    renderActivities();
    renderServices();
    renderGallery();
  }
  async function saveData(patch) {
    var r = await fetch(API+'/admin-data', { method:'POST', headers:{'Content-Type':'application/json','x-admin-token':token}, body: JSON.stringify(patch) });
    var d = await r.json();
    if (!r.ok) throw new Error('Save failed: ' + (d.error || r.status));
    return d;
  }

  /* ── Cloudinary upload ── */
  async function uploadToCloudinary(file, folder) {
    var signR = await fetch(API+'/cloudinary-sign', { method:'POST', headers:{'Content-Type':'application/json','x-admin-token':token}, body: JSON.stringify({ folder }) });
    var sig = await signR.json();
    var fd = new FormData();
    fd.append('file', file); fd.append('api_key', sig.apiKey);
    fd.append('timestamp', sig.timestamp); fd.append('signature', sig.signature); fd.append('folder', sig.folder);
    var up = await fetch('https://api.cloudinary.com/v1_1/'+sig.cloudName+'/image/upload', { method:'POST', body:fd });
    var res = await up.json();
    if (!up.ok) throw new Error(res.error && res.error.message || 'Upload failed');
    return res.secure_url;
  }

  /* ══════════════════════════════════════════
     ACTIVITIES
  ══════════════════════════════════════════ */
  var COLOR_MAP = { purple:'#61367F', magenta:'#CE2A7A', sky:'#0A7FC8', teal:'#0E6B63', green:'#089C6C', orange:'#E8650A', red:'#C0392B', indigo:'#3D3B8E', cyan:'#0891B2', yellow:'#B45309' };

  function renderActivities() {
    var list = $('#activities-list');
    list.innerHTML = '';
    siteData.activities.forEach(function(act, i) {
      var color = COLOR_MAP[act.color || 'purple'];
      var thumb = act.logo || (act.photos && act.photos[0]) || 'assets/img/logo.png';
      var photoCount = (act.photos && act.photos.length) || 0;
      var card = document.createElement('div');
      card.className = 'admin-card';
      card.innerHTML =
        '<div class="act-card-ic" style="background:' + color + '20;border:2px solid ' + color + '">' +
          '<img src="' + esc(thumb) + '" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:6px">' +
        '</div>' +
        '<div class="admin-card__body">' +
          '<h3>' + esc(act.title) + '</h3>' +
          '<p>' + esc(act.desc) + '</p>' +
          '<span class="photo-badge">' + photoCount + ' photo' + (photoCount !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        '<div class="admin-card__edit"><button class="btn btn--outline btn--sm" data-idx="' + i + '">Edit</button></div>';
      list.appendChild(card);
    });
    list.querySelectorAll('[data-idx]').forEach(function(btn) {
      btn.addEventListener('click', function() { openActivityModal(parseInt(btn.dataset.idx)); });
    });
  }

  $('#new-activity-btn').addEventListener('click', function() { openActivityModal(-1); });

  function openActivityModal(idx) {
    editingActIdx = idx;
    var act = idx >= 0 ? siteData.activities[idx] : { id:'', title:'', desc:'', color:'purple', icon:'i-cap', logo:'', photos:[] };
    actPhotos = (act.photos || []).slice(); // working copy

    $('#modal-activity-title').textContent = idx >= 0 ? 'Edit Activity' : 'New Activity';
    $('#act-id').value = act.id || '';
    $('#act-title').value = act.title || '';
    $('#act-desc').value = act.desc || '';
    $('#act-color').value = act.color || 'purple';
    $('#act-icon').value = act.icon || 'i-cap';

    var logoPrev = $('#act-logo-preview');
    if (act.logo) { logoPrev.src = act.logo; logoPrev.style.display = ''; }
    else logoPrev.style.display = 'none';

    renderActPhotos();
    $('#delete-activity-btn').style.display = idx >= 0 ? '' : 'none';
    var m = $('#modal-activity');
    if (m.showModal) m.showModal(); else m.setAttribute('open','');
  }

  function renderActPhotos() {
    var grid = $('#act-photos-grid');
    var count = $('#act-photo-count');
    grid.innerHTML = '';
    count.textContent = '(' + actPhotos.length + ')';
    actPhotos.forEach(function(src, i) {
      var div = document.createElement('div');
      div.className = 'photo-item';
      div.innerHTML = '<img src="' + esc(src) + '" alt="Photo ' + (i+1) + '"><button class="photo-item__del" data-i="' + i + '" title="Remove">✕</button>';
      grid.appendChild(div);
    });
    grid.querySelectorAll('.photo-item__del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        actPhotos.splice(parseInt(btn.dataset.i), 1);
        renderActPhotos();
      });
    });
  }

  $('#act-photo-upload').addEventListener('change', async function() {
    var files = Array.from(this.files);
    if (!files.length) return;
    var btn = $('#save-activity-btn');
    setLoading(btn, true);
    try {
      for (var f of files) {
        var url = await uploadToCloudinary(f, 'tsu/activities');
        actPhotos.push(url);
      }
      renderActPhotos();
      toast(files.length + ' photo(s) uploaded');
    } catch(ex) { toast(ex.message, true); }
    finally { setLoading(btn, false); this.value = ''; }
  });

  /* Per-activity logo upload */
  $('#act-logo-upload').addEventListener('change', async function() {
    var file = this.files[0]; if (!file) return;
    var btn = $('#save-activity-btn');
    setLoading(btn, true);
    try {
      var url = await uploadToCloudinary(file, 'tsu/activity-logos');
      var prev = $('#act-logo-preview');
      prev.src = url; prev.style.display = '';
      toast('Icon image uploaded');
    } catch(ex) { toast(ex.message, true); }
    finally { setLoading(btn, false); this.value = ''; }
  });

  $('#act-logo-clear').addEventListener('click', function() {
    var prev = $('#act-logo-preview');
    prev.src = ''; prev.style.display = 'none';
  });

  $('#save-activity-btn').addEventListener('click', async function() {
    var title = $('#act-title').value.trim();
    if (!title) { toast('Title is required', true); return; }
    setLoading(this, true);
    try {
      var logoPrev = $('#act-logo-preview');
      var act = {
        id: $('#act-id').value || title.toLowerCase().replace(/\s+/g,'-'),
        title: title,
        desc: $('#act-desc').value.trim(),
        color: $('#act-color').value,
        icon: $('#act-icon').value,
        logo: logoPrev.style.display !== 'none' ? logoPrev.src : '',
        photos: actPhotos.slice()
      };
      if (editingActIdx >= 0) siteData.activities[editingActIdx] = act;
      else siteData.activities.push(act);
      await saveData({ activities: siteData.activities });
      renderActivities();
      $('#modal-activity').close();
      toast('Activity saved');
    } catch(ex) { toast(ex.message, true); }
    finally { setLoading(this, false); }
  });

  $('#delete-activity-btn').addEventListener('click', async function() {
    if (!confirm('Delete this activity?')) return;
    siteData.activities.splice(editingActIdx, 1);
    await saveData({ activities: siteData.activities });
    renderActivities();
    $('#modal-activity').close();
    toast('Activity deleted');
  });

  $('#close-activity-modal').addEventListener('click', function() { $('#modal-activity').close(); });

  /* ══════════════════════════════════════════
     SERVICES
  ══════════════════════════════════════════ */
  function renderServices() {
    var list = $('#services-list');
    list.innerHTML = '';
    siteData.services.forEach(function(svc, i) {
      var isDone = svc.status === 'done';
      var badge = isDone
        ? '<span class="status-badge status-badge--done">✓ Completed</span>'
        : '<span class="status-badge status-badge--upcoming">⏰ Upcoming</span>';
      var card = document.createElement('div');
      card.className = 'admin-card';
      card.innerHTML =
        '<img class="admin-card__thumb" src="' + esc(svc.coverPhoto || 'assets/img/logo.png') + '" alt="">' +
        '<div class="admin-card__body">' +
          '<h3>' + esc(svc.title) + '</h3>' +
          '<p>' + esc(svc.location || '') + '</p>' +
          badge +
        '</div>' +
        '<div class="admin-card__edit"><button class="btn btn--outline btn--sm" data-idx="' + i + '">Edit</button></div>';
      list.appendChild(card);
    });
    list.querySelectorAll('[data-idx]').forEach(function(btn) {
      btn.addEventListener('click', function() { openServiceModal(parseInt(btn.dataset.idx)); });
    });
  }

  $('#new-service-btn').addEventListener('click', function() { openServiceModal(-1); });

  function openServiceModal(idx) {
    editingSvcIdx = idx;
    var svc = idx >= 0 ? siteData.services[idx] : { id:'', title:'', desc:'', status:'upcoming', location:'', coverPhoto:'', actionLabel:'Support this', actionLink:'#donate' };
    $('#modal-service-title').textContent = idx >= 0 ? 'Edit Service' : 'New Service';
    $('#svc-id').value = svc.id || '';
    $('#svc-title').value = svc.title || '';
    $('#svc-desc').value = svc.desc || '';
    $('#svc-status').value = svc.status || 'upcoming';
    $('#svc-location').value = svc.location || '';
    $('#svc-action-label').value = svc.actionLabel || 'Support this';
    $('#svc-action-link').value = svc.actionLink || '#donate';
    var prev = $('#svc-cover-preview');
    if (svc.coverPhoto) { prev.src = svc.coverPhoto; prev.style.display = ''; }
    else prev.style.display = 'none';
    $('#delete-service-btn').style.display = idx >= 0 ? '' : 'none';
    var m = $('#modal-service');
    if (m.showModal) m.showModal(); else m.setAttribute('open','');
  }

  $('#svc-cover-upload').addEventListener('change', async function() {
    var file = this.files[0]; if (!file) return;
    try {
      var url = await uploadToCloudinary(file, 'tsu/services');
      var prev = $('#svc-cover-preview');
      prev.src = url; prev.style.display = '';
      toast('Cover uploaded');
    } catch(ex) { toast(ex.message, true); }
    this.value = '';
  });

  $('#save-service-btn').addEventListener('click', async function() {
    var title = $('#svc-title').value.trim();
    if (!title) { toast('Title is required', true); return; }
    setLoading(this, true);
    try {
      var prev = $('#svc-cover-preview');
      var svc = {
        id: $('#svc-id').value || title.toLowerCase().replace(/\s+/g,'-'),
        title: title,
        desc: $('#svc-desc').value.trim(),
        status: $('#svc-status').value,
        location: $('#svc-location').value.trim(),
        coverPhoto: prev.style.display !== 'none' ? prev.src : '',
        actionLabel: $('#svc-action-label').value,
        actionLink: $('#svc-action-link').value.trim()
      };
      if (editingSvcIdx >= 0) siteData.services[editingSvcIdx] = svc;
      else siteData.services.push(svc);
      await saveData({ services: siteData.services });
      renderServices();
      $('#modal-service').close();
      toast('Service saved');
    } catch(ex) { toast(ex.message, true); }
    finally { setLoading(this, false); }
  });

  $('#delete-service-btn').addEventListener('click', async function() {
    if (!confirm('Delete this service?')) return;
    siteData.services.splice(editingSvcIdx, 1);
    await saveData({ services: siteData.services });
    renderServices();
    $('#modal-service').close();
    toast('Service deleted');
  });

  $('#close-service-modal').addEventListener('click', function() { $('#modal-service').close(); });

  /* ══════════════════════════════════════════
     GALLERY
  ══════════════════════════════════════════ */
  var GALLERY_DEFAULT = [
    { src: 'assets/img/hero.jpg',         cap: 'Food drive team, Ranipet' },
    { src: 'assets/img/poster.jpg',       cap: 'Our official poster' },
    { src: 'assets/img/g-team-left.jpg',  cap: 'Volunteers on duty' },
    { src: 'assets/img/g-banner.jpg',     cap: 'Where it happens' },
    { src: 'assets/img/g-team-wide.jpg',  cap: 'Together, as one team' },
    { src: 'assets/img/g-packets.jpg',    cap: 'Packed with care' },
    { src: 'assets/img/banner-full.jpg',  cap: 'Our story in one frame' },
    { src: 'assets/img/g-women.jpg',      cap: 'Women leading the way' },
    { src: 'assets/img/g-lead.jpg',       cap: 'Standing together' },
    { src: 'assets/img/g-men.jpg',        cap: 'After a day of service' },
    { src: 'assets/img/g-team-right.jpg', cap: 'Our young volunteers' },
    { src: 'assets/img/schl_event-1.jpg', cap: 'School Event' }
  ];

  function getGallery() {
    return siteData.gallery && siteData.gallery.length ? siteData.gallery : GALLERY_DEFAULT;
  }

  function renderGallery() {
    var grid = $('#gallery-grid');
    if (!grid) return;
    var items = getGallery();
    grid.innerHTML = '';
    items.forEach(function(item, i) {
      var div = document.createElement('div');
      div.className = 'gal-admin-item';
      div.innerHTML =
        '<img src="' + esc(item.src) + '" alt="' + esc(item.cap) + '">' +
        '<input class="gal-cap-input" data-i="' + i + '" value="' + esc(item.cap) + '" placeholder="Caption...">' +
        '<button class="photo-item__del gal-del" data-i="' + i + '" title="Delete">✕</button>';
      grid.appendChild(div);
    });
    // Save caption on blur
    grid.querySelectorAll('.gal-cap-input').forEach(function(inp) {
      inp.addEventListener('blur', async function() {
        var items = getGallery();
        items[parseInt(inp.dataset.i)].cap = inp.value.trim();
        siteData.gallery = items;
        await saveData({ gallery: items });
        toast('Caption saved');
      });
    });
    grid.querySelectorAll('.gal-del').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!confirm('Remove this photo from gallery?')) return;
        var items = getGallery();
        items.splice(parseInt(btn.dataset.i), 1);
        siteData.gallery = items;
        await saveData({ gallery: items });
        renderGallery();
        toast('Photo removed');
      });
    });
  }

  $('#gal-upload').addEventListener('change', async function() {
    var files = Array.from(this.files);
    if (!files.length) return;
    try {
      var items = getGallery().slice();
      for (var f of files) {
        var url = await uploadToCloudinary(f, 'tsu/gallery');
        items.push({ src: url, cap: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g,' ') });
      }
      siteData.gallery = items;
      await saveData({ gallery: items });
      renderGallery();
      toast(files.length + ' photo(s) added to gallery');
    } catch(ex) { toast(ex.message, true); }
    this.value = '';
  });

  document.getElementById('tab-gallery').addEventListener('click', function(e) {
    var btn = e.target.closest('.gal-del');
    if (btn) return; // handled above
  });

  // Re-attach gallery upload after any re-render
  function attachGalUpload() {
    var inp = document.getElementById('gal-upload');
    if (inp) inp.addEventListener('change', handleGalUpload);
  }
  async function handleGalUpload() {
    var files = Array.from(this.files);
    if (!files.length) return;
    try {
      var items = getGallery().slice();
      for (var f of files) {
        var url = await uploadToCloudinary(f, 'tsu/gallery');
        items.push({ src: url, cap: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g,' ') });
      }
      siteData.gallery = items;
      await saveData({ gallery: items });
      renderGallery();
      toast(files.length + ' photo(s) added to gallery');
    } catch(ex) { toast(ex.message, true); }
    this.value = '';
  }
  attachGalUpload();

  /* ── Modal backdrop / Escape ── */
  ['modal-activity','modal-service'].forEach(function(id) {
    document.getElementById(id).addEventListener('click', function(e) { if (e.target === this) this.close(); });
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') ['modal-activity','modal-service'].forEach(function(id) {
      var m = document.getElementById(id); if (m.open) m.close();
    });
  });

  /* ── Init ── */
  if (token) {
    loadData().then(function() { screen('screen-dash'); }).catch(function() {
      sessionStorage.removeItem('tsu-admin-token'); token = ''; screen('screen-login');
    });
  } else {
    screen('screen-login');
  }

})();
