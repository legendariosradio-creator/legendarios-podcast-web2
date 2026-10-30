import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('PEGA_AQUI') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('PEGA_AQUI');
const sb = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
let session = null, settings = {}, playlists = [], assets = [];

const defaults = {
  brand_name: 'LEGENDARIOS',
  brand_subtitle: 'Playlist · JoseLuis',
  logo_url: 'assets/logo.png',
  hero_badge: 'Nueva Playlist Diaria Disponible',
  hero_title: 'LA MÚSICA<br><em>NO MUERE</em>',
  hero_text: 'Un espacio conducido por JoseLuis.',
  platform_title: 'DISPONIBLE EN TODAS TUS PLATAFORMAS',
  platform_text: 'Sigue los episodios diarios',
  playlist_title: 'SELECCIÓN MUSICAL',
  playlist_text: 'Explora las listas',
  contact_title: 'PIDE TU TEMA',
  contact_text: 'Envía tu petición',
  youtube_url: 'https://www.youtube.com',
  ivoox_url: 'https://www.ivoox.com',
  facebook_url: 'https://www.facebook.com',
  accent_color: '#eab308',
  background_color: '#080808'
};

function message(t, err = false) {
  const el = $('#status');
  el.textContent = t;
  el.classList.remove('hidden', 'error');
  if (err) el.classList.add('error');
}

function clearMessage() {
  $('#status').classList.add('hidden');
}

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, function(c) {
    return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c];
  });
}

function setForm(form, obj) {
  for (const el of form.elements) {
    if (el.name && obj[el.name] !== undefined && el.type !== 'file') {
      el.value = obj[el.name];
    }
  }
}

function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (el.name && el.type !== 'file' && el.type !== 'button' && el.type !== 'submit') {
      out[el.name] = el.value;
    }
  }
  return out;
}

async function requireAdmin() {
  if (!sb) {
    $('#setupWarning').classList.remove('hidden');
    return false;
  }
  const { data: { session: s } } = await sb.auth.getSession();
  session = s;
  if (!s) {
    showLoggedOut();
    return false;
  }
  const { data: allowed, error } = await sb.rpc('is_admin');
  if (error || !allowed) {
    await sb.auth.signOut();
    showLoggedOut();
    message('Esta cuenta no está autorizada como administradora.', true);
    return false;
  }
  showLoggedIn();
  await refresh();
  return true;
}

function showLoggedOut() {
  $('#loginPanel').classList.remove('hidden');
  $('#dashboard').classList.add('hidden');
  $('#logoutBtn').classList.add('hidden');
}

function showLoggedIn() {
  $('#loginPanel').classList.add('hidden');
  $('#dashboard').classList.remove('hidden');
  $('#logoutBtn').classList.remove('hidden');
}

async function refresh() {
  clearMessage();
  const [{ data: sd }, { data: pd }, { data: ad }] = await Promise.all([
    sb.from('site_settings').select('*'),
    sb.from('playlists').select('*').order('sort_order'),
    sb.storage.from('media').list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  ]);
  settings = { ...defaults };
  for (const x of sd || []) settings[x.key] = x.draft_value ?? x.value;
  playlists = pd || [];
  assets = ad || [];
  setForm($('#settingsForm'), settings);
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearMessage();
  if (!sb) return;
  const { error } = await sb.auth.signInWithPassword({
    email: $('#email').value,
    password: $('#password').value
  });
  if (error) {
    message('No se ha podido iniciar sesión: ' + error.message, true);
    return;
  }
  await requireAdmin();
});

$('#logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLoggedOut();
  message('Sesión cerrada.');
});

if (configured) requireAdmin();
else {
  showLoggedOut();
  $('#setupWarning').classList.remove('hidden');
}