(function () {
  'use strict';

  var API = '/api';
  var token = sessionStorage.getItem('tsu-admin-token') || '';
  var siteData = { activities: [], services: [], logo: 'assets/img/logo.png' };
  var editingActIdx = -1;
  var editingSvcIdx = -1;

  /* ── Helpers ── */
  function $(s, c) { return (c || document).querySelector(s); }
  function show(id) { document.getElementById(id).hidden = false; }
  function hide(id) { document.getElementById(id).hidden = true; }
  function screen(id) {
    ['screen-login','screen-otp','screen-dash'].forEach(function(s){ document.getElementById(s).hidden = s !== id; });
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

  /* ── Login ── */
  $('#login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = $('#login-btn');
    var err = $('#login-err');
    err.textContent = '';
    setLoading(btn, true);
    try {
      var r = await fetch(API + '/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('#l-email').value.trim(), password: $('#l-pass').value })
      });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Login failed');
      screen('screen-otp');
      if (d.otp) {
        $('#otp-hint').innerHTML = 'Email not configured yet. Your OTP is:<br><strong style="font-size:1.6rem;letter-spacing:6px;color:#212C5C;font-family:monospace">' + d.otp + '</strong>';
      } else {
        $('#otp-hint').textContent = 'A 6-digit code was sent to your email. Valid for 60 seconds.';
      }
      $('#l-otp').focus();
    } catch(ex) {
      err.textContent = ex.message;
    } finally { setLoading(btn, false); }
  });

  /* ── OTP ── */
  $('#otp-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = $('#otp-btn');
    var err = $('#otp-err');
    err.textContent = '';
    setLoading(btn, true);
    try {
      var r = await fetch(API + '/admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: $('#l-otp').value.trim() })
      });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Invalid OTP');
      token = d.token;
      sessionStorage.setItem('tsu-admin-token', token);
      await loadData();
      screen('screen-dash');
    } catch(ex) {
      err.textContent = ex.message;
    } finally { setLoading(btn, false); }
  });

  /* ── Logout ── */
  $('#logout-btn').addEventListener('click', function() {
    sessionStorage.removeItem('tsu-admin-token');
    token = '';
    screen('screen-login');
  });

  /* ── Tab switching ── */
  document.querySelectorAll('.dash-nav__btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.dash-nav__btn').forEach(function(b){ b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var tab = btn.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(function(p){ p.hidden = true; });
      document.getElementById('tab-' + tab).hidden = false;
    });
  });

  /* ── Load data ── */
  async function loadData() {
    var r = await fetch(API + '/admin-data');
    siteData = await r.json();
    renderActivities();
    renderServices();
    if (siteData.logo) {
      $('#logo-preview').src = siteData.logo;
    }
  }

  /* ── Save data ── */
  async function saveData(patch) {
    var r = await fetch(API + '/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(patch)
    });
    if (!r.ok) throw new Error('Save failed');
  }

  /* ── Cloudinary upload ── */
  async function uploadToCloudinary(file, folder) {
    var signR = await fetch(API + '/cloudinary-sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ folder: folder })
    });
    var sig = await signR.json();
    var fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', sig.apiKey);
    fd.append('timestamp', sig.timestamp);
    fd.append('signature', sig.signature);
    fd.append('folder', sig.folder);
    var up = await fetch('https://api.cloudinary.com/v1_1/' + sig.cloudName + '/image/upload', { method: 'POST', body: fd });
    var res = await up.json();
    if (!up.ok) throw new Error(res.error && res.error.message || 'Upload failed');
    return res.secure_url;
  }

  /* ══════════════════════════════════════════
     ACTIVITIES
  ══════════════════════════════════════════ */
  function renderActivities() {
    var list = $('#activities-list');
    list.innerHTML = '';
    siteData.activities.forEach(function(act, i) {
      var card = document.createElement('div');
      card.className = 'admin-card';
      var thumb = (act.photos && act.photos[0]) ? act.photos[0] : 'assets/img/logo.png';
      card.innerHTML =
        '<img class="admin-card__thumb" src="' + thumb + '" alt="">' +
        '<div class="admin-card__body"><h3>' + esc(act.title) + '</h3><p>' + esc(act.desc) + '</p></div>' +
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
    var act = idx >= 0 ? siteData.activities[idx] : { id: '', title: '', desc: '', photos: [] };
    $('#modal-activity-title').textContent = idx >= 0 ? 'Edit Activity' : 'New Activity';
    $('#act-id').value = act.id || '';
    $('#act-title').value = act.title || '';
    $('#act-desc').value = act.desc || '';
    renderActPhotos(act.photos || []);
    $('#delete-activity-btn').style.display = idx >= 0 ? '' : 'none';
    var m = $('#modal-activity');
    if (m.showModal) m.showModal(); else m.setAttribute('open','');
  }

  function renderActPhotos(photos) {
    var grid = $('#act-photos-grid');
    grid.innerHTML = '';
    photos.forEach(function(src, i) {
      var div = document.createElement('div');
      div.className = 'photo-item';
      div.innerHTML = '<img src="' + src + '" alt=""><button class="photo-item__del" data-i="' + i + '" title="Remove">✕</button>';
      grid.appendChild(div);
    });
    grid.querySelectorAll('.photo-item__del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var act = editingActIdx >= 0 ? siteData.activities[editingActIdx] : { photos: [] };
        act.photos.splice(parseInt(btn.dataset.i), 1);
        renderActPhotos(act.photos);
      });
    });
  }

  $('#act-photo-upload').addEventListener('change', async function() {
    var files = Array.from(this.files);
    if (!files.length) return;
    var btn = $('#save-activity-btn');
    setLoading(btn, true);
    try {
      var act = editingActIdx >= 0 ? siteData.activities[editingActIdx] : { photos: [] };
      for (var f of files) {
        var url = await uploadToCloudinary(f, 'tsu/activities');
        act.photos = act.photos || [];
        act.photos.push(url);
      }
      renderActPhotos(act.photos);
      toast('Photos uploaded');
    } catch(ex) { toast(ex.message, true); }
    finally { setLoading(btn, false); this.value = ''; }
  });

  $('#save-activity-btn').addEventListener('click', async function() {
    var title = $('#act-title').value.trim();
    if (!title) { toast('Title is required', true); return; }
    setLoading(this, true);
    try {
      var photos = Array.from($('#act-photos-grid').querySelectorAll('img')).map(function(img){ return img.src; });
      var act = {
        id: $('#act-id').value || title.toLowerCase().replace(/\s+/g,'-'),
        title: title,
        desc: $('#act-desc').value.trim(),
        photos: photos
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

  /* ── Logo upload ── */
  $('#logo-upload').addEventListener('change', async function() {
    var file = this.files[0];
    if (!file) return;
    try {
      var url = await uploadToCloudinary(file, 'tsu/logo');
      siteData.logo = url;
      $('#logo-preview').src = url;
      await saveData({ logo: url });
      toast('Logo updated');
    } catch(ex) { toast(ex.message, true); }
    this.value = '';
  });

  /* ══════════════════════════════════════════
     SERVICES
  ══════════════════════════════════════════ */
  function renderServices() {
    var list = $('#services-list');
    list.innerHTML = '';
    siteData.services.forEach(function(svc, i) {
      var card = document.createElement('div');
      card.className = 'admin-card';
      card.innerHTML =
        '<img class="admin-card__thumb" src="' + esc(svc.coverPhoto || 'assets/img/logo.png') + '" alt="">' +
        '<div class="admin-card__body"><h3>' + esc(svc.title) + '</h3><p>' + esc(svc.location || '') + ' · ' + esc(svc.status || '') + '</p></div>' +
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
    var file = this.files[0];
    if (!file) return;
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

  /* ── Close modals on backdrop click ── */
  ['modal-activity','modal-service'].forEach(function(id) {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) this.close();
    });
  });

  /* ── Escape key ── */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      ['modal-activity','modal-service'].forEach(function(id) {
        var m = document.getElementById(id);
        if (m.open) m.close();
      });
    }
  });

  /* ── Escape helper ── */
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Init: if already have token, try loading data ── */
  if (token) {
    loadData().then(function() { screen('screen-dash'); }).catch(function() {
      sessionStorage.removeItem('tsu-admin-token');
      token = '';
      screen('screen-login');
    });
  } else {
    screen('screen-login');
  }

})();
