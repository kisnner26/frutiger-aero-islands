import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { readableSupabaseError } from '../../persistence/supabase';
import { claimAeroCycle, craftAeroRecipe, getAeroResources, listAeroRecipes, type AeroRecipe, type AeroResources } from '../../persistence/workshop';
import './workshop.css';
import { AeroLoader } from '../../ui/AeroLoader';
import { tr } from '../../i18n';

const EMPTY: AeroResources = { water: 0, crystals: 0, leaves: 0, lastCycleAt: null };

function canCraft(recipe: AeroRecipe, resources: AeroResources) {
  return resources.water >= recipe.waterCost && resources.crystals >= recipe.crystalCost && resources.leaves >= recipe.leafCost;
}

function cycleText(last: string | null) {
  if (!last) return tr('disponible ahora', 'available now');
  const remaining = new Date(last).getTime() - Date.now();
  if (remaining <= 0) return tr('disponible ahora', 'available now');
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return tr(`vuelve en ${hours} h ${minutes} min`, `back in ${hours} h ${minutes} min`);
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
      .catch((error) => alive && setMessage(readableSupabaseError(error, tr('el laboratorio necesita la migración de recursos.', 'the lab needs the resources migration.'))));
    return () => { alive = false; };
  }, []);

  const available = useMemo(() => resources ?? EMPTY, [resources]);
  const claim = async () => {
    setWorking('cycle'); setMessage('');
    try { setResources(await claimAeroCycle()); sfx.coin(); setMessage(tr('ciclo recolectado: agua, cristales y hojas para tus recetas.', 'cycle collected: water, crystals and leaves for your recipes.')); }
    catch (error) { setMessage(readableSupabaseError(error, tr('no se pudo recoger el ciclo aero.', 'could not collect the aero cycle.'))); }
    finally { setWorking(null); }
  };
  const craft = async (recipe: AeroRecipe) => {
    setWorking(recipe.id); setMessage('');
    try { const result = await craftAeroRecipe(recipe.id); setResources(result.resources); sfx.levelUp(); setMessage(tr(`creaste ${result.outputName}. colección: ${result.amount}.`, `you made ${result.outputName}. collection: ${result.amount}.`)); }
    catch (error) { setMessage(readableSupabaseError(error, tr('no se pudo completar la receta.', 'could not complete the recipe.'))); }
    finally { setWorking(null); }
  };

  return <section className="workshop" aria-labelledby="workshop-title" aria-busy={resources === null && !message}>
    <header className="workshop__head"><div><p>{tr('taller de isla', 'island workshop')}</p><h2 id="workshop-title">{tr('laboratorio aero', 'aero lab')}</h2></div><button type="button" className="workshop__arcade" onClick={onOpenArcade}>{tr('desafío arcade', 'arcade challenge')}</button></header>
    <div className="workshop__stock" aria-label={tr('recursos disponibles', 'available resources')}>
      <span><b className="workshop__drop" aria-hidden="true" />{tr('agua', 'water')} <strong>{available.water}</strong></span>
      <span><b className="workshop__crystal" aria-hidden="true" />{tr('cristales', 'crystals')} <strong>{available.crystals}</strong></span>
      <span><b className="workshop__leaf" aria-hidden="true" />{tr('hojas', 'leaves')} <strong>{available.leaves}</strong></span>
    </div>
    <div className="workshop__cycle"><div><strong>{tr('ciclo de marea', 'tide cycle')}</strong><small>{tr('recoge recursos cada seis horas. el servidor valida cada entrega.', 'collect resources every six hours. the server validates every delivery.')}</small></div><button type="button" className="vista-button vista-button--primary" disabled={working !== null || cycleText(available.lastCycleAt) !== tr('disponible ahora', 'available now')} onClick={() => void claim()}>{working === 'cycle' ? tr('recogiendo...', 'collecting...') : cycleText(available.lastCycleAt)}</button></div>
    <div className="workshop__recipes" aria-label={tr('recetas', 'recipes')}>
      {(recipes ?? []).map((recipe) => {
        const locked = level < recipe.unlockLevel;
        const ready = canCraft(recipe, available);
        return <article key={recipe.id} className={locked ? 'is-locked' : ''}><div className={`workshop__recipe-icon workshop__recipe-icon--${recipe.outputKind}`} aria-hidden="true" /><div><strong>{recipe.name}</strong><small>{recipe.description}</small><em>{recipe.waterCost} {tr('agua', 'water')} · {recipe.crystalCost} {tr('cristal', 'crystal')} · {recipe.leafCost} {tr('hojas', 'leaves')}</em></div>{locked ? <span className="workshop__lock">{tr('nivel', 'level')} {recipe.unlockLevel}</span> : <button type="button" disabled={!ready || working !== null} onClick={() => void craft(recipe)}>{working === recipe.id ? tr('creando...', 'crafting...') : ready ? tr('crear', 'craft') : tr('faltan recursos', 'not enough resources')}</button>}</article>;
      })}
    </div>
    {!recipes && !message && <AeroLoader variant="inline" text={tr('cargando recetas...', 'loading recipes...')} />}
    {message && <p className="workshop__message" role="status">{message}</p>}
  </section>;
}
