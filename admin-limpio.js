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
    sb.storage.from('media').list('', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } })
  ]);
  settings = { ...defaults };
  for (const x of sd || []) settings[x.key] = x.draft_value ?? x.value;
  playlists = pd || [];
  assets = ad || [];
  
  const settingsForm = $('#settingsForm');
  if (settingsForm) setForm(settingsForm, settings);
  
  renderPlaylistsAdmin();
  renderAssetsAdmin();
}

function getAssetPublicUrl(path) {
  if (!path) return '';
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return data?.publicUrl || path;
}

function renderAssetsAdmin() {
  const container = $('#assetList');
  if (!container) return;
  if (!assets.length) {
    container.innerHTML = '<p class="muted" style="font-size:13px; margin-top:10px;">No hay archivos multimedia subidos todavía.</p>';
    return;
  }
  container.innerHTML = `
    <div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">
      <p style="font-size:13px; color:#eab308; margin:0;">Archivos disponibles en Supabase (${assets.length}):</p>
      ${assets.map(file => {
        const url = getAssetPublicUrl(file.name);
        return `<div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:8px; border-radius:4px; border:1px solid #333; font-size:12px;">
          <span style="color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%;">${esc(file.name)}</span>
          <button type="button" class="btn outline copy-url-btn" data-url="${url}" style="padding:4px 8px; font-size:11px;">Copiar URL</button>
        </div>`;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.copy-url-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const url = e.target.getAttribute('data-url');
      navigator.clipboard.writeText(url);
      message('¡URL copiada al portapapeles!');
    });
  });
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
    item.className = 'playlist-row-card';
    item.dataset.id = p.id;
    item.style = "background: rgba(255,255,255,0.03); border: 1px solid rgba(234,179,8,0.2); padding: 15px; border-radius: 8px;";
    
    const assetOptions = assets.map(file => {
      const url = getAssetPublicUrl(file.name);
      const selected = p.image_url === url ? 'selected' : '';
      return `<option value="${url}" ${selected}>${esc(file.name)}</option>`;
    }).join('');

    item.innerHTML = `
      <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <input type="text" class="p-title" value="${esc(p.title || '')}" placeholder="Título" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
        <input type="text" class="p-category" value="${esc(p.category || '')}" placeholder="Categoría" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
        <input type="number" class="p-sort" value="${p.sort_order || (index + 1)}" placeholder="Orden" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
      </div>
      <div style="display:grid; grid-template-columns: 2fr 2fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div style="display:flex; flex-direction:column; gap:6px;">
          <input type="text" class="p-image" value="${esc(p.image_url || '')}" placeholder="URL de la imagen" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
          <div style="display:flex; gap:6px; align-items:center;">
            <select class="p-image-select" style="flex:1; padding:6px; background:#111; color:#eab308; border:1px solid #333; border-radius:4px; font-size:11px;">
              <option value="">-- Seleccionar archivo subido --</option>
              ${assetOptions}
            </select>
            <label class="btn outline" style="padding:4px 8px; font-size:11px; cursor:pointer; margin:0; white-space:nowrap;">
              Subir nueva <input type="file" class="p-quick-upload" accept="image/*" style="display:none;">
            </label>
          </div>
        </div>
        <input type="text" class="p-link" value="${esc(p.link_url || '')}" placeholder="Enlace de destino" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
        <input type="text" class="p-button" value="${esc(p.button_text || 'Escuchar / Ver')}" placeholder="Texto botón" style="padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px;">
      </div>
      <textarea class="p-desc" placeholder="Descripción de la playlist" style="width:100%; padding:8px; background:#111; color:#fff; border:1px solid #333; border-radius:4px; margin-bottom:10px; resize:vertical; height:60px;">${esc(p.description || '')}</textarea>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label style="color:#fff; font-size:13px; display:flex; align-items:center; gap:5px; cursor:pointer;">
          <input type="checkbox" class="p-published" ${p.published !== false ? 'checked' : ''}> Publicada en la web
        </label>
        <div style="display:flex; gap:10px;">
          <button class="save-playlist-btn btn gold" data-id="${p.id}" style="padding:6px 12px; font-size:12px; cursor:pointer;" type="button">Guardar cambios</button>
          <button class="delete-playlist-btn" data-id="${p.id}" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;" type="button">Eliminar</button>
        </div>
      </div>
    `;
    
    // Cambiar input de imagen al seleccionar del desplegable
    const selectEl = item.querySelector('.p-image-select');
    if (selectEl) {
      selectEl.addEventListener('change', e => {
        if (e.target.value) {
          item.querySelector('.p-image').value = e.target.value;
        }
      });
    }

    // Subida rápida de imagen directamente desde la tarjeta de la playlist
    const quickUpload = item.querySelector('.p-quick-upload');
    if (quickUpload) {
      quickUpload.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        message('Subiendo imagen...');
        const fileName = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const { error } = await sb.storage.from('media').upload(fileName, file);
        if (error) {
          message('Error al subir: ' + error.message, true);
        } else {
          const publicUrl = getAssetPublicUrl(fileName);
          item.querySelector('.p-image').value = publicUrl;
          message('¡Imagen subida y asignada con éxito! Pulsa "Guardar cambios".');
          await refresh();
        }
      });
    }

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
      const card = e.target.closest('.playlist-row-card');
      if (!card) return;

      const title = card.querySelector('.p-title').value;
      const category = card.querySelector('.p-category').value;
      const image_url = card.querySelector('.p-image').value;
      const link_url = card.querySelector('.p-link').value;
      const button_text = card.querySelector('.p-button').value;
      const sort_order = parseInt(card.querySelector('.p-sort').value) || 1;
      const description = card.querySelector('.p-desc').value;
      const published = card.querySelector('.p-published').checked;

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

$('#uploadForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  clearMessage();
  const fileInput = $('#assetFile');
  const file = fileInput.files[0];
  if (!file) return;
  const fileName = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const { error } = await sb.storage.from('media').upload(fileName, file);
  if (error) {
    message('Error al subir archivo: ' + error.message, true);
  } else {
    message('¡Archivo subido con éxito!');
    fileInput.value = '';
    await refresh();
  }
});

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