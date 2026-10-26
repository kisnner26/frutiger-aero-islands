import { useState, useSyncExternalStore } from 'react';
import { PALETTES, TITLES, cosmetics, titleName, useCosmetics } from '../../persistence/cosmetics';
import { SEASON, TIERS, XP_PER_TIER, claim, claimedTiers, hasPremium, passLevel, perks, subscribePassXp, tiers, totalXp, type Reward } from '../../persistence/pass';
import { tr } from '../../i18n';
import './pass.css';

const tick = () => totalXp();

function RewardCard({ r, state, track }: { r: Reward; state: 'taken' | 'ready' | 'locked' | 'far'; track: 'free' | 'aero' }) {
  const label =
    r.kind === 'brillos' ? `+${r.n}` : r.kind === 'paleta' ? PALETTES.find((p) => p.id === r.id)?.name ?? r.id : titleName(r.id);
  const kind = r.kind === 'brillos' ? tr('brillos', 'sparkles') : r.kind === 'paleta' ? tr('suelo', 'ground') : tr('título', 'title');
  const swatch = r.kind === 'paleta' ? `#${(PALETTES.find((p) => p.id === r.id)?.tint ?? 0xffffff).toString(16).padStart(6, '0')}` : undefined;
  return (
    <div className={`pass-card pass-card--${track} is-${state}${r.kind !== 'brillos' ? ' is-special' : ''}`}>
      {swatch ? <i className="pass-card__swatch" style={{ background: swatch }} aria-hidden="true" /> : <i className={`pass-card__ico pass-card__ico--${r.kind}`} aria-hidden="true" />}
      <strong>{label}</strong>
      <small>{kind}</small>
      {state === 'taken' && <span className="pass-card__mark" aria-label={tr('cobrado', 'claimed')}>✓</span>}
      {state === 'locked' && <span className="pass-card__mark pass-card__mark--lock" aria-label={tr('bloqueado', 'locked')}>🔒︎</span>}
    </div>
  );
}

/** pase de temporada: una vía gratuita y la vía aero, con premios que se desbloquean al jugar. */
export function PassWindow() {
  useSyncExternalStore(subscribePassXp, tick);
  const owned = useCosmetics();
  const [, setN] = useState(0);
  const xp = totalXp();
  const { tier, into } = passLevel(xp);
  const done = claimedTiers();
  const premium = hasPremium();
  const freeReady = tiers.filter((t) => t.n <= tier && !done.free.includes(t.n)).length;
  const aeroReady = premium ? tiers.filter((t) => t.n <= tier && !done.aero.includes(t.n)).length : 0;
  const bonus = perks(premium);
  return (
    <div className="pass">
      <header className="pass__head">
        <div>
          <strong>{SEASON.name}</strong>
          <small>
            {tr('escalón', 'tier')} {tier}/{TIERS} · {tier >= TIERS ? tr('completado', 'complete') : `${into}/${XP_PER_TIER} xp`}
          </small>
          <i className="pass__bar" aria-hidden="true">
            <b style={{ width: `${Math.min(100, (tier >= TIERS ? 1 : into / XP_PER_TIER) * 100)}%` }} />
          </i>
          <small className="pass__how">{tr('gana experiencia reventando burbujas, decorando y jugando aero arena', 'earn xp by popping bubbles, decorating and playing aero arena')}</small>
        </div>
        <div className="pass__actions">
          <button type="button" className="chipbtn" disabled={!freeReady} onClick={() => { claim('free'); setN((n) => n + 1); }}>
            {tr('cobrar gratis', 'claim free')}{freeReady ? ` (${freeReady})` : ''}
          </button>
          {premium ? (
            <button type="button" className="chipbtn" disabled={!aeroReady} onClick={() => { claim('aero'); setN((n) => n + 1); }}>
              {tr('cobrar aero', 'claim aero')}{aeroReady ? ` (${aeroReady})` : ''}
            </button>
          ) : (
            <span className="pass__soon">{tr('pase aero: próximamente', 'aero pass: coming soon')}</span>
          )}
        </div>
      </header>

      <section className="pass__perks" aria-label={tr('ventajas del pase aero', 'aero pass perks')}>
        <strong>{tr('pase aero', 'aero pass')}</strong>
        <ul>
          <li>{tr('+20% de brillos al reventar burbujas', '+20% sparkles from popping bubbles')}{bonus.popBonus ? ' ✓' : ''}</li>
          <li>{tr('25% de descuento en terreno', '25% off land')}{bonus.landDiscount ? ' ✓' : ''}</li>
          <li>{tr('suelos y títulos exclusivos', 'exclusive grounds and titles')}</li>
          <li>{tr('más brillos en cada escalón', 'more sparkles on every tier')}</li>
        </ul>
      </section>

      <div className="pass__rail" role="list" aria-label={tr('escalones', 'tiers')}>
        <div className="pass__legend" aria-hidden="true">
          <span>{tr('gratis', 'free')}</span>
          <span className="is-aero">aero</span>
        </div>
        {tiers.map((t) => {
          const reached = t.n <= tier;
          return (
            <div role="listitem" key={t.n} className={`pass__tier${reached ? ' is-reached' : ''}`}>
              <b>{t.n}</b>
              <RewardCard r={t.free} track="free" state={done.free.includes(t.n) ? 'taken' : reached ? 'ready' : 'far'} />
              <RewardCard r={t.aero} track="aero" state={premium ? (done.aero.includes(t.n) ? 'taken' : reached ? 'ready' : 'far') : 'locked'} />
            </div>
          );
        })}
      </div>

      <section className="pass__wardrobe" aria-label={tr('tu colección', 'your collection')}>
        <strong>{tr('suelo de tu isla', 'your island ground')}</strong>
        <div className="pass__chips">
          {PALETTES.map((p) => {
            const has = owned.palettes.includes(p.id);
            return (
              <button key={p.id} type="button" className={`pass__chip${owned.palette === p.id ? ' is-on' : ''}`} disabled={!has} aria-pressed={owned.palette === p.id} onClick={() => cosmetics.equipPalette(p.id)}>
                <i style={{ background: `#${p.tint.toString(16).padStart(6, '0')}` }} aria-hidden="true" />
                {p.name}
              </button>
            );
          })}
        </div>
        <strong>{tr('título', 'title')}</strong>
        <div className="pass__chips">
          {TITLES.map((t) => {
            const has = owned.titles.includes(t.id);
            return (
              <button key={t.id} type="button" className={`pass__chip${owned.title === t.id ? ' is-on' : ''}`} disabled={!has} aria-pressed={owned.title === t.id} onClick={() => cosmetics.equipTitle(t.id)}>
                {t.name}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
