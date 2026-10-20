// verifica contra el supabase real la migración de país (202610200002_country.sql).
// uso (la contraseña se escribe solo en tu terminal; no se guarda ni se imprime):
//   PRUEBA_EMAIL=correo@ejemplo.com PRUEBA_CLAVE='tu clave' node tools/verificar-pais.mjs
// lee VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY de .env.local. la cuenta de prueba debe tener perfil (haber creado su isla).
// efecto: si la cuenta no tiene país, se le asigna "ni" (nicaragua). un país ya elegido solo se cambia si pasó el plazo de 30 días.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.PRUEBA_EMAIL;
const clave = process.env.PRUEBA_CLAVE;
if (!url || !key || !email || !clave) {
  console.error('faltan VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY en .env.local o PRUEBA_EMAIL / PRUEBA_CLAVE en el entorno.');
  process.exit(2);
}

const resultados = [];
const comprobar = (nombre, ok, detalle = '') => {
  resultados.push(ok);
  console.log(`${ok ? 'correcto ' : 'FALLO    '} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

const anon = createClient(url, key, { auth: { persistSession: false } });
const user = createClient(url, key, { auth: { persistSession: false } });

// 1. tabla de países pública y completa
const { count, error: eCount } = await anon.from('countries').select('code', { count: 'exact', head: true });
comprobar('la tabla countries es legible sin sesión', !eCount && (count ?? 0) >= 130, eCount?.message ?? `${count} códigos`);

// 2. sin sesión no se puede llamar a la función ni escribir el perfil
const { error: eAnonRpc } = await anon.rpc('set_my_country', { p_country: 'ni' });
comprobar('sin sesión set_my_country se rechaza', !!eAnonRpc, eAnonRpc?.message);
const { data: upd, error: eAnonUpd } = await anon.from('profiles').update({ country_code: 'ni' }).neq('id', '00000000-0000-0000-0000-000000000000').select('id');
comprobar('sin sesión no se puede escribir profiles.country_code', !!eAnonUpd || !upd || upd.length === 0, eAnonUpd?.message ?? 'sin filas afectadas');

// 3. con sesión
const { data: auth, error: eIn } = await user.auth.signInWithPassword({ email, password: clave });
if (eIn || !auth.session) {
  comprobar('inicio de sesión de la cuenta de prueba', false, eIn?.message);
  process.exit(1);
}
comprobar('inicio de sesión de la cuenta de prueba', true);
const uid = auth.user.id;

const leer = async () => (await user.from('profiles').select('country_code').eq('id', uid).maybeSingle()).data?.country_code ?? null;
const antes = await leer();

// 4. país inválido
const { error: eBad } = await user.rpc('set_my_country', { p_country: 'zz' });
comprobar('un código inexistente se rechaza', !!eBad, eBad?.message);
const { error: eBad2 } = await user.rpc('set_my_country', { p_country: "ni'; drop table profiles;--" });
comprobar('un valor malformado se rechaza', !!eBad2, eBad2?.message);

// 5. fijar o conservar el país
if (antes === null) {
  const { data, error } = await user.rpc('set_my_country', { p_country: 'ni' });
  comprobar('primera elección de país', !error && data === 'ni', error?.message ?? String(data));
} else {
  console.log(`info      la cuenta ya tiene país (${antes}); se omite la primera elección`);
}
const actual = await leer();
comprobar('el país queda guardado en el perfil', actual !== null, String(actual));

// 6. repetir el mismo país es idempotente
const { error: eSame } = await user.rpc('set_my_country', { p_country: actual });
comprobar('repetir el mismo país no falla', !eSame, eSame?.message);

// 7. cambiar a otro país dentro de 30 días se rechaza
const otro = actual === 'jp' ? 'es' : 'jp';
const { error: eChange } = await user.rpc('set_my_country', { p_country: otro });
console.log(eChange ? `correcto  cambio de país bloqueado — ${eChange.message}` : 'info      el cambio se aceptó: el último cambio de esta cuenta tenía más de 30 días');
if (!eChange) await user.rpc('set_my_country', { p_country: actual }).catch(() => undefined);

// 8. lectura pública del país
const { data: pub, error: ePub } = await anon.from('profiles').select('username,country_code').eq('id', uid).maybeSingle();
comprobar('el país del perfil es legible sin sesión', !ePub && pub?.country_code === (await leer()), ePub?.message);

// 9. la fecha del último cambio es privada
const { error: ePriv } = await anon.from('profiles').select('country_changed_at').limit(1);
comprobar('country_changed_at no es legible por el público', !!ePriv, ePriv?.message);

await user.auth.signOut();
const fallos = resultados.filter((r) => !r).length;
console.log(fallos ? `\n${fallos} comprobaciones fallaron` : '\ntodas las comprobaciones pasaron');
process.exit(fallos ? 1 : 0);
