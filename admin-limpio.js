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
  if (!el) return;
  el.textContent = t;
  el.classList.remove('hidden', 'error');
  if (err) el.classList.add('error');
}

function clearMessage() {
  const el = $('#status');
  if (el) el.classList.add('hidden');
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

async function requireAdmin() {
  if (!sb) {
    $('#setupWarning')?.classList.remove('hidden');
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
  $('#loginPanel')?.classList.remove('hidden');
  $('#dashboard')?.classList.add('hidden');
  $('#logoutBtn')?.classList.add('hidden');
}

function showLoggedIn() {
  $('#loginPanel')?.classList.add('hidden');
  $('#dashboard')?.classList.remove('hidden');
  $('#logoutBtn')?.classList.remove('hidden');
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
  
  const settingsForm = $('#settingsForm');
  if (settingsForm) setForm(settingsForm, settings);
  
  renderPlaylistsAdmin();
}

function renderPlaylistsAdmin() {
  const container = $('#managePlaylists') || $('#playlistsAdminContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
      <h3 style="margin:0; color:#eab308;">Listado de Playlists (${playlists.length} de 10+)</h3>
      <button id="addNewPlaylistBtn" class="btn gold" type="button" style="padding:6px 12px; font-size:13px;">+ Añadir Playlist</button>
    </div>
    <div id="playlistsListRows" style="display:flex; flex-direction:column; gap:15px;"></div>
  `;

  const rowsContainer = $('#playlistsListRows');
  
  playlists.forEach((p, index) => {
    const item = document.createElement('div');
    item.style = "background: rgba(255,255,255,0.03); border: 1px solid rgba(234,179,8,0.2); padding: 15px; border-radius: 8px;";
    item.innerHTML = `
      <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <input type="text" data-id="${p.id}" name="title" value="${esc(p.title || '')}" placeholder="Título" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
        <input type="text" data-id="${p.id}" name="category" value="${esc(p.category || '')}" placeholder="Categoría" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
        <input type="number" data-id="${p.id}" name="sort_order" value="${p.sort_order || (index + 1)}" placeholder="Orden" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
      </div>
      <div style="display:grid; grid-template-columns: 2fr 2fr 1fr; gap: 10px; margin-bottom: 10px;">
        <input type="text" data-id="${p.id}" name="image_url" value="${esc(p.image_url || '')}" placeholder="URL de la imagen / portada" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
        <input type="text" data-id="${p.id}" name="link_url" value="${esc(p.link_url || '')}" placeholder="Enlace de destino" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
        <input type="text" data-id="${p.id}" name="button_text" value="${esc(p.button_text || 'Escuchar / Ver')}" placeholder="Texto botón" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
      </div>
      <textarea data-id="${p.id}" name="description" placeholder="Descripción de la playlist" style="width:100%; padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; margin-bottom:10px; resize:vertical; height:60px;">${esc(p.description || '')}</textarea>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label style="color:#fff; font-size:13px; display:flex; align-items:center; gap:5px; cursor:pointer;">
          <input type="checkbox" data-id="${p.id}" name="published" ${p.published !== false ? 'checked' : ''}> Publicada en la web
        </label>
        <div style="display:flex; gap:10px;">
          <button class="save-playlist-btn btn gold" data-id="${p.id}" style="padding:6px 12px; font-size:12px; cursor:pointer;" type="button">Guardar cambios</button>
          <button class="delete-playlist-btn" data-id="${p.id}" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;" type="button">Eliminar</button>
        </div>
      </div>
    `;
    rowsContainer.appendChild(item);
  });

  $('#addNewPlaylistBtn')?.addEventListener('click', async () => {
    const newOrder = playlists.length + 1;
    const { error } = await sb.from('playlists').insert([{
      title: 'Nueva Playlist',
      category: 'Categoría',
      image_url: 'assets/logo.png',
      link_url: 'https://www.youtube.com',
      button_text: 'Escuchar / Ver',
      description: 'Descripción breve de la playlist',
      published: true,
      sort_order: newOrder
    }]);
    if (error) {
      message('Error al crear la playlist: ' + error.message, true);
    } else {
      message('¡Playlist creada con éxito!');
      await refresh();
    }
  });

  document.querySelectorAll('.save-playlist-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.target.getAttribute('data-id');
      const card = e.target.closest('div').parentNode;
      const title = card.querySelector('[name="title"]').value;
      const category = card.querySelector('[name="category"]').value;
      const image_url = card.querySelector('[name="image_url"]').value;
      const link_url = card.querySelector('[name="link_url"]').value;
      const button_text = card.querySelector('[name="button_text"]').value;
      const sort_order = parseInt(card.querySelector('[name="sort_order"]').value) || 1;
      const description = card.querySelector('[name="description"]').value;
      const published = card.querySelector('[name="published"]').checked;

      const { error } = await sb.from('playlists').update({
        title, 
        category, 
        image_url, 
        link_url, 
        button_text, 
        sort_order, 
        description, 
        published
      }).eq('id', id);

      if (error) {
        message('Error al guardar: ' + error.message, true);
      } else {
        message('¡Playlist guardada correctamente!');
        await refresh();
      }
    });
  });

  document.querySelectorAll('.delete-playlist-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      if (!confirm('¿Seguro que quieres eliminar esta playlist?')) return;
      const id = e.target.getAttribute('data-id');
      const { error } = await sb.from('playlists').delete().eq('id', id);
      if (error) {
        message('Error al eliminar: ' + error.message, true);
      } else {
        message('Playlist eliminada.');
        await refresh();
      }
    });
  });
}

$('#loginForm')?.addEventListener('submit', async e => {
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

$('#logoutBtn')?.addEventListener('click', async () => {
  await sb.auth.signOut();
  showLoggedOut();
  message('Sesión cerrada.');
});

if (configured) requireAdmin();
else {
  showLoggedOut();
  $('#setupWarning')?.classList.remove('hidden');
}