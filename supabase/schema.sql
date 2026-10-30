-- Ejecuta este archivo en Supabase > SQL Editor, después de crear un usuario en Authentication.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid()); $$;
grant execute on function public.is_admin() to anon, authenticated;
create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  draft_value text,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Playlist',
  description text not null default '',
  image_url text not null default 'assets/logo.png',
  link_url text not null,
  button_text text not null default 'Escuchar / Ver',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.playlists enable row level security;
drop policy if exists "admins can read admin list" on public.admin_users;
create policy "admins can read admin list" on public.admin_users for select to authenticated using (public.is_admin());
drop policy if exists "public reads published settings" on public.site_settings;
create policy "public reads published settings" on public.site_settings for select to anon, authenticated using (is_published = true);
drop policy if exists "admins manage settings" on public.site_settings;
create policy "admins manage settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public reads published playlists" on public.playlists;
create policy "public reads published playlists" on public.playlists for select to anon, authenticated using (published = true);
drop policy if exists "admins manage playlists" on public.playlists;
create policy "admins manage playlists" on public.playlists for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Public bucket permits visitors to view media URLs, but only admins can upload/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media','media',true,104857600,array['image/*','audio/*','video/*','application/pdf','text/plain','application/zip','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=true, file_size_limit=104857600;
drop policy if exists "public can view media" on storage.objects;
create policy "public can view media" on storage.objects for select to anon, authenticated using (bucket_id = 'media');
drop policy if exists "admins upload media" on storage.objects;
create policy "admins upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "admins update media" on storage.objects;
create policy "admins update media" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
-- Initial visible content copied from the saved site. The admin may edit it after setup.
insert into public.playlists (title,category,description,image_url,link_url,button_text,published,sort_order)
values
('Nueva Playlist Diaria','Diario en YouTube','Playlists diarias en vídeo con sonido de alta definición.','assets/logo.png','https://www.youtube.com/channel/UCezcXIjqHVrbHIe6BuEGFUA','Ver en YouTube',true,1),
('Rock, Blues, Jazz & Swing','Podcast en iVoox','Escucha todos los programas emitidos para llevar en el móvil.','assets/logo.png','https://www.ivoox.com/podcast-legendarios-playlist_sq_f13242468_1.html','Escuchar en iVoox',true,2),
('Programas en Directo','Emisión Spreaker','Emisión de radio digital con calidad de estudio profesional.','assets/logo.png','https://www.spreaker.com/network/19392326','Sintonizar Spreaker',true,3)
on conflict do nothing;
