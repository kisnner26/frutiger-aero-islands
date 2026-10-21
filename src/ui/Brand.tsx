import { tr } from '../i18n';

/** orbe del logo: esfera de cristal azul-verde con brillo y una hoja, el símbolo de la marca. */
export function BrandOrb({ size = 56 }: { size?: number }) {
  return (
    <svg className="brand-orb" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="bo-sphere" cx=".35" cy=".28" r=".95"><stop offset="0" stopColor="#f2ffff" /><stop offset=".38" stopColor="#6fd6ff" /><stop offset=".72" stopColor="#1a8fe0" /><stop offset="1" stopColor="#0a4a98" /></radialGradient>
        <linearGradient id="bo-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d6ff8a" /><stop offset="1" stopColor="#38b43a" /></linearGradient>
        <linearGradient id="bo-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#bo-sphere)" stroke="#fff" strokeOpacity=".9" strokeWidth="2" />
      <path d="M20 44 C20 28 34 18 48 20 C48 34 38 46 24 46 Z" fill="url(#bo-leaf)" stroke="#1f7a2a" strokeOpacity=".55" strokeWidth="1.2" />
      <path d="M22 44 C30 36 38 30 45 23" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="25" cy="15" rx="15" ry="8" fill="url(#bo-gloss)" />
      <ellipse cx="32" cy="58" rx="16" ry="3" fill="#7fe8ff" opacity=".35" />
    </svg>
  );
}

/** marca completa: orbe + nombre. `compact` la reduce para cabeceras. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand${compact ? ' brand--compact' : ''}`} role="img" aria-label="frutiger aero islands">
      <BrandOrb size={compact ? 40 : 64} />
      <div className="brand__words" aria-hidden="true">
        <span className="brand__top">frutiger aero</span>
        <span className="brand__bottom">islands</span>
      </div>
    </div>
  );
}

/** atmósfera de la era aero: auroras, destellos y bokeh detrás de la portada. */
export function AeroAtmosphere() {
  return (
    <div className="brand-atmo" aria-hidden="true">
      <i className="brand-atmo__aurora brand-atmo__aurora--a" />
      <i className="brand-atmo__aurora brand-atmo__aurora--b" />
      <i className="brand-atmo__flare" />
      {Array.from({ length: 9 }, (_, i) => <b key={i} className="brand-atmo__bokeh" />)}
    </div>
  );
}

/** línea de identidad bajo el título. */
export function EraStrip() {
  return <p className="brand-era">{tr('vidrio · hierba · burbujas · cielo', 'glass · grass · bubbles · sky')} <span>{tr('la era aero, 2004–2013', 'the aero era, 2004–2013')}</span></p>;
}
