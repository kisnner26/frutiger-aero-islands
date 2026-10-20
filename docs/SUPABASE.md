# supabase: cuentas e islas

## configuración local

crear `.env.local` desde `.env.example`:

```text
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_clave_publica
VITE_BASE_PATH=/
```

la clave pública puede estar en el navegador. no añadir una service role ni contraseñas al repositorio.

aplicar `supabase/migrations/202610200001_community.sql` en un proyecto de desarrollo antes de iniciar el cliente. configura en supabase las urls de redirección de autenticación para la dirección local y la dirección final de github pages, ambas con `#/auth`.

## garantías actuales

- `complete_profile` crea perfil e isla inicial una sola vez por `auth.uid()`.
- `save_island` bloquea el registro, comprueba propietario y revisión, y rechaza diseños con más de 150 objetos.
- las tablas públicas solo permiten lectura directa. las escrituras pasan por funciones con sesión autenticada.
- el correo no se expone en el esquema público.

## pendiente de validación remota

hacer pruebas con dos cuentas reales tras configurar un proyecto: alta, confirmación de correo, guardado, conflicto de revisión, visita anónima y denegación de edición ajena. el frontend no considera listo este flujo solo porque compile.
