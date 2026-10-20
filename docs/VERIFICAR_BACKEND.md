# aplicar y verificar la migración de país en supabase

estado: la migración `supabase/migrations/202610200002_country.sql` está escrita y revisada, **sin aplicar**. quien aplica y verifica necesita acceso al proyecto; este entorno no tiene ni la cli de supabase ni una conexión a la base.

## 1. aplicar (una vez)

opción a, panel web: supabase → sql editor → pegar el contenido de `supabase/migrations/202610200002_country.sql` → run. es aditiva: crea `countries`, añade dos columnas a `profiles` y la función `set_my_country`. no toca `complete_profile` ni `save_island`. asume que la migración `202610200001_community.sql` ya está aplicada.

opción b, cli: `supabase link --project-ref <ref>` y `supabase db push`.

para deshacerla: `drop function public.set_my_country(text); alter table public.profiles drop column country_code, drop column country_changed_at; drop table public.countries;`

## 2. verificar

```bash
PRUEBA_EMAIL=correo@ejemplo.com PRUEBA_CLAVE='tu clave' npm run verificar:pais
```

la cuenta de prueba debe haber creado su isla (tener perfil). la contraseña solo se escribe en tu terminal. el script comprueba: tabla `countries` pública, `set_my_country` rechazada sin sesión, sin escritura directa de `country_code`, país inválido y malformado rechazados, primera elección, idempotencia, bloqueo de cambio antes de 30 días, lectura pública del país y privacidad de `country_changed_at`. si la cuenta no tenía país se le asigna nicaragua (`ni`).

## 3. después, en el navegador

con la cuenta: entrar, elegir país en el selector, recargar y cambiar de dispositivo (debe aparecer el mismo país y la isla en su zona del mundo); intentar cambiarlo de inmediato (debe explicar el plazo de 30 días).
