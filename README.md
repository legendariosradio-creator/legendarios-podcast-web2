# Legendarios Playlist — Web administrable

Este paquete transforma la copia guardada de `moonlit-torrone-853e4f.netlify.app` en una base web editable con el diseño oscuro/dorado original, logo extraído de la copia, playlists públicas, panel privado, carga de archivos, borradores y vista previa local.

## Importante: lo que falta para que quede conectado en Internet

El archivo `.mhtml` era una captura estática de la web, no el proyecto original de Netlify. No contiene credenciales de administración ni un backend. Por seguridad no se ha inventado ni incluido ninguna contraseña. Para tener persistencia y acceso privado real hay que conectar una base de datos/almacenamiento Supabase y desplegar este proyecto en Netlify.

## Instalación (una vez)

1. Crea un proyecto en https://supabase.com/ y abre **Project Settings → API**. Copia la **Project URL** y la clave pública **anon/publishable**.
2. Abre `config.js` y sustituye `PEGA_AQUI_TU_URL_DE_SUPABASE`, `PEGA_AQUI_TU_CLAVE_PUBLICA_ANON` y `TU_CORREO@EJEMPLO.COM`. La clave pública está diseñada para el navegador; nunca pongas una `service_role` o clave secreta aquí.
3. En Supabase, abre **SQL Editor**, pega y ejecuta todo `supabase/schema.sql`.
4. En Supabase → **Authentication → Users**, crea tu usuario con tu correo y una contraseña fuerte. Desactiva el registro público si aparece habilitado; el acceso debe ser solo por invitación/usuario creado por ti.
5. Copia el UUID del usuario creado. En SQL Editor ejecuta, sustituyendo el UUID:

   ```sql
   insert into public.admin_users (user_id)
   values ('UUID-DEL-USUARIO-CREADO');
   ```

6. Sube la carpeta completa `legendarios-admin` a un repositorio Git o arrástrala/despliégala en Netlify. Configura el sitio para publicar la raíz de esta carpeta; no requiere build command.
7. Abre `/admin.html`, inicia sesión con el usuario que creaste y edita el contenido. El público verá solamente playlists con `published = true` y valores de configuración publicados.

## Funciones incluidas

- Página pública adaptable a móvil, tablet y ordenador con estilo oscuro/dorado.
- Panel de administración con autenticación Supabase y lista de administradores autorizados.
- Edición de marca, textos, enlaces y color de acento.
- Subida de logo, portadas, audio, vídeo y documentos (límite de 100 MB por archivo).
- CRUD de playlists, orden, estado borrador/publicado.
- Guardado de borradores de ajustes y botón para publicar cambios.
- Vista previa privada de los ajustes y playlists que están cargados en el panel.
- Políticas RLS para que visitantes anónimos no puedan insertar, editar ni borrar contenido.

## Notas de seguridad y operación

- El archivo de configuración contiene solo la URL y clave pública de Supabase. La protección real está en Auth, RLS y las políticas de Storage.
- No compartas tu usuario/contraseña del panel.
- El almacenamiento es público para lectura de medios (necesario para que se vean las portadas y se reproduzcan audios), pero solo un administrador autorizado puede subir, actualizar o borrar archivos. No subas documentos privados.
- El formulario de peticiones abre el programa de correo del visitante; no guarda peticiones en una base de datos.
- Para audios muy largos o tráfico elevado, revisa los límites y costes del proveedor de almacenamiento antes de publicar.
- Esta es una base funcional que requiere completar la configuración de Supabase y desplegarla. No se ha modificado ni desplegado la web que actualmente está publicada en Netlify.
