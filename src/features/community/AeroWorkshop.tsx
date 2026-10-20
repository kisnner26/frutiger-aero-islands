import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { readableSupabaseError } from '../../persistence/supabase';
import { claimAeroCycle, craftAeroRecipe, getAeroResources, listAeroRecipes, type AeroRecipe, type AeroResources } from '../../persistence/workshop';
import './workshop.css';

const EMPTY: AeroResources = { water: 0, crystals: 0, leaves: 0, lastCycleAt: null };

function canCraft(recipe: AeroRecipe, resources: AeroResources) {
  return resources.water >= recipe.waterCost && resources.crystals >= recipe.crystalCost && resources.leaves >= recipe.leafCost;
}

function cycleText(last: string | null) {
  if (!last) return 'disponible ahora';
  const remaining = new Date(last).getTime() - Date.now();
  if (remaining <= 0) return 'disponible ahora';
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return `vuelve en ${hours} h ${minutes} min`;
}

/** laboratorio de progreso: los recursos y recetas viven en supabase, no en el navegador. */
export function AeroWorkshop({ level, onOpenArcade }: { level: number; onOpenArcade: () => void }) {
  const [resources, setResources] = useState<AeroResources | null>(null);
  const [recipes, setRecipes] = useState<AeroRecipe[] | null>(null);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getAeroResources(), listAeroRecipes()])
      .then(([r, list]) => { if (alive) { setResources(r); setRecipes(list); } })
      .catch((error) => alive && setMessage(readableSupabaseError(error, 'el laboratorio necesita la migración de recursos.')));
    return () => { alive = false; };
  }, []);

  const available = useMemo(() => resources ?? EMPTY, [resources]);
  const claim = async () => {
    setWorking('cycle'); setMessage('');
    try { setResources(await claimAeroCycle()); sfx.coin(); setMessage('ciclo recolectado: agua, cristales y hojas para tus recetas.'); }
    catch (error) { setMessage(readableSupabaseError(error, 'no se pudo recoger el ciclo aero.')); }
    finally { setWorking(null); }
  };
  const craft = async (recipe: AeroRecipe) => {
    setWorking(recipe.id); setMessage('');
    try { const result = await craftAeroRecipe(recipe.id); setResources(result.resources); sfx.levelUp(); setMessage(`creaste ${result.outputName}. colección: ${result.amount}.`); }
    catch (error) { setMessage(readableSupabaseError(error, 'no se pudo completar la receta.')); }
    finally { setWorking(null); }
  };

  return <section className="workshop" aria-labelledby="workshop-title" aria-busy={resources === null && !message}>
    <header className="workshop__head"><div><p>taller de isla</p><h2 id="workshop-title">laboratorio aero</h2></div><button type="button" className="workshop__arcade" onClick={onOpenArcade}>desafío arcade</button></header>
    <div className="workshop__stock" aria-label="recursos disponibles">
      <span><b className="workshop__drop" aria-hidden="true" />agua <strong>{available.water}</strong></span>
      <span><b className="workshop__crystal" aria-hidden="true" />cristales <strong>{available.crystals}</strong></span>
      <span><b className="workshop__leaf" aria-hidden="true" />hojas <strong>{available.leaves}</strong></span>
    </div>
    <div className="workshop__cycle"><div><strong>ciclo de marea</strong><small>recoge recursos cada seis horas. el servidor valida cada entrega.</small></div><button type="button" className="vista-button vista-button--primary" disabled={working !== null || cycleText(available.lastCycleAt) !== 'disponible ahora'} onClick={() => void claim()}>{working === 'cycle' ? 'recogiendo...' : cycleText(available.lastCycleAt)}</button></div>
    <div className="workshop__recipes" aria-label="recetas">
      {(recipes ?? []).map((recipe) => {
        const locked = level < recipe.unlockLevel;
        const ready = canCraft(recipe, available);
        return <article key={recipe.id} className={locked ? 'is-locked' : ''}><div className={`workshop__recipe-icon workshop__recipe-icon--${recipe.outputKind}`} aria-hidden="true" /><div><strong>{recipe.name}</strong><small>{recipe.description}</small><em>{recipe.waterCost} agua · {recipe.crystalCost} cristal · {recipe.leafCost} hojas</em></div>{locked ? <span className="workshop__lock">nivel {recipe.unlockLevel}</span> : <button type="button" disabled={!ready || working !== null} onClick={() => void craft(recipe)}>{working === recipe.id ? 'creando...' : ready ? 'crear' : 'faltan recursos'}</button>}</article>;
      })}
    </div>
    {!recipes && !message && <p className="workshop__message" role="status">cargando recetas...</p>}
    {message && <p className="workshop__message" role="status">{message}</p>}
  </section>;
}
