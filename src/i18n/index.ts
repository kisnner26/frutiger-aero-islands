/**
 * Idioma de la interfaz. Se elige una vez al cargar (guardado, ?lang= o idioma del navegador);
 * cambiarlo recarga la página, así los textos fijos de los módulos no necesitan reactividad.
 */
export type Lang = 'es' | 'en';

const KEY = 'frutiger-aero-islands:lang';

function detect(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'es' || q === 'en') {
      window.localStorage.setItem(KEY, q);
      return q;
    }
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* sin almacenamiento: seguimos con el idioma del navegador */
  }
  return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
}

export const lang: Lang = typeof window === 'undefined' ? 'es' : detect();

if (typeof document !== 'undefined') document.documentElement.lang = lang;

/** devuelve el texto en el idioma activo. */
export function tr(es: string, en: string): string {
  return lang === 'es' ? es : en;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* sin almacenamiento: el parámetro de la URL sirve igual */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('lang', next);
  window.location.href = url.toString();
}
