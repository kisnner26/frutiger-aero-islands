const urineDescriptions = {
  clara: ['orina muy diluida', 'la hidratación alta reduce la concentración de pigmentos urinarios.'],
  normal: ['filtración equilibrada', 'la sangre entra a ambos riñones; las nefronas filtran y devuelven al cuerpo el agua y los solutos necesarios.'],
  oscura: ['orina concentrada', 'con menos agua disponible, aumenta la reabsorción renal y la orina se vuelve más oscura.'],
  hematuria: ['sangre visible en la orina', 'la coloración rojiza requiere valoración médica; puede tener varias causas y no debe autodiagnosticarse.']
};

const stoneDescriptions = {
  calcio: 'oxalato o fosfato de calcio: son los tipos más frecuentes.',
  urico: 'ácido úrico: puede formarse cuando la orina contiene demasiado ácido.',
  estruvita: 'estruvita: puede aparecer después de una infección urinaria y crecer con rapidez.',
  cistina: 'cistina: se relaciona con cistinuria, un trastorno hereditario poco común.'
};

const organDescriptions = {
  kidney: ['riñón izquierdo', 'cada riñón contiene cerca de un millón de nefronas que filtran plasma, recuperan sustancias útiles y forman orina.'],
  bladder: ['vejiga', 'reservorio muscular que se distiende durante el llenado y se contrae durante la micción.'],
  prostate: ['próstata', 'rodea la uretra proximal. si aumenta de tamaño puede dificultar el vaciado y dejar orina residual.']
};

export function bindUI(root, simulation) {
  const water = root.querySelector('#water');
  const filter = root.querySelector('#filter');
  const adh = root.querySelector('#adh');
  const mineral = root.querySelector('#mineral');
  const citrate = root.querySelector('#citrate');
  const statusTitle = root.querySelector('#status-title');
  const statusDetail = root.querySelector('#status-detail');
  const setStatus = (title, detail) => { statusTitle.textContent = title; statusDetail.textContent = detail; };
  const restoreStatus = () => {
    const urine = root.querySelector('[data-urine][aria-pressed="true"]').dataset.urine;
    setStatus(...urineDescriptions[urine]);
  };

  water.addEventListener('input', () => { root.querySelector('#water-value').value = `${water.value} ml`; simulation.setState({ water: Number(water.value) }); });
  filter.addEventListener('input', () => { root.querySelector('#filter-value').value = `${filter.value} %`; simulation.setState({ filter: Number(filter.value) }); });
  adh.addEventListener('input', () => { root.querySelector('#adh-value').value = `${adh.value} %`; simulation.setState({ adh: Number(adh.value) }); });
  mineral.addEventListener('input', () => { root.querySelector('#mineral-value').value = `${mineral.value} %`; simulation.setState({ mineral: Number(mineral.value) }); });
  citrate.addEventListener('input', () => { root.querySelector('#citrate-value').value = `${citrate.value} %`; simulation.setState({ citrate: Number(citrate.value) }); });
  root.querySelectorAll('[data-urine]').forEach(button => button.addEventListener('click', () => {
    root.querySelectorAll('[data-urine]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    simulation.setState({ urine: button.dataset.urine }); setStatus(...urineDescriptions[button.dataset.urine]);
  }));
  root.querySelector('#stone').addEventListener('change', event => {
    simulation.setState({ stone: event.target.checked });
    event.target.checked ? setStatus('cristalización iniciada', 'los solutos sobresaturados comienzan a nuclearse dentro del riñón izquierdo. aumenta los minerales o reduce el agua para acelerar el proceso.') : restoreStatus();
  });
  root.querySelector('#infection').addEventListener('change', event => {
    simulation.setState({ infection: event.target.checked });
    event.target.checked ? setStatus('infección ascendente', 'las partículas verdes representan microorganismos que ascienden desde la uretra hacia la vejiga y, si progresa, al riñón.') : restoreStatus();
  });
  root.querySelector('#protein').addEventListener('change', event => {
    simulation.setState({ protein: event.target.checked });
    event.target.checked ? setStatus('barrera glomerular alterada', 'moléculas grandes que normalmente permanecen en la sangre aparecen en el filtrado y avanzan hacia la orina como proteinuria.') : restoreStatus();
  });
  root.querySelector('#prostate').addEventListener('change', event => {
    simulation.setState({ prostate: event.target.checked });
    event.target.checked ? setStatus('salida uretral estrechada', 'la próstata comprime la uretra, reduce el chorro y aumenta el volumen residual después de orinar.') : restoreStatus();
  });
  root.querySelector('#void').addEventListener('click', () => {
    simulation.void(); setStatus('micción activa', 'la vejiga se contrae, los esfínteres se coordinan y la orina sale por la uretra.'); window.setTimeout(restoreStatus, 1800);
  });
  root.querySelectorAll('[data-stone-type]').forEach(button => button.addEventListener('click', () => {
    root.querySelectorAll('[data-stone-type]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    simulation.setState({ stoneType: button.dataset.stoneType });
    root.querySelector('#stone-type-detail').textContent = stoneDescriptions[button.dataset.stoneType];
  }));
  root.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => {
    const enabled = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(enabled));
    root.querySelector('#anatomy-stage').classList.toggle(`hide-${button.dataset.layer}`, !enabled);
  }));
  root.querySelectorAll('[data-organ]').forEach(button => button.addEventListener('click', () => {
    const [title, detail] = organDescriptions[button.dataset.organ];
    const panel = root.querySelector('#organ-detail'); panel.querySelector('b').textContent = title; panel.querySelector('span').textContent = detail;
  }));

  let lastReadout = 0;
  const flowHistory = Array(40).fill(1.2);
  let lastChart = 0;
  root.addEventListener('simulationtick', event => {
    const now = performance.now(); if (now - lastReadout < 120) return; lastReadout = now;
    const { gfr, flow, bladder, residual, hydration, stoneRisk, stoneProgress } = event.detail;
    root.querySelector('#gfr').textContent = gfr; root.querySelector('#urine-flow').textContent = flow.toFixed(1); root.querySelector('#bladder-volume').textContent = Math.round(bladder); root.querySelector('#residual').textContent = residual;
    const concentrationIndex = hydration - simulation.state.adh / 100;
    root.querySelector('#concentration').textContent = concentrationIndex > 1.1 ? 'diluida' : concentrationIndex < .15 ? 'alta' : 'normal';
    const riskLabel = stoneRisk > .72 ? 'riesgo alto' : stoneRisk > .42 ? 'riesgo moderado' : 'riesgo bajo';
    root.querySelector('#stone-risk-value').textContent = riskLabel;
    const activeStep = stoneProgress > .9 ? 4 : stoneProgress > .55 ? 3 : stoneProgress > .2 ? 2 : stoneProgress > .02 ? 1 : 0;
    root.querySelectorAll('[data-stone-step]').forEach(item => item.classList.toggle('is-active', Number(item.dataset.stoneStep) <= activeStep));
    if (simulation.state.stone && activeStep === 4) setStatus('obstrucción ureteral', 'el cálculo bloquea parcialmente el uréter izquierdo; la presión se transmite hacia el riñón y disminuye el flujo urinario de ese lado.');
    if (now - lastChart > 650) {
      lastChart = now; flowHistory.push(flow); flowHistory.shift();
      const max = Math.max(2.2, ...flowHistory); const points = flowHistory.map((value, index) => `${index / (flowHistory.length - 1) * 300},${70 - value / max * 60}`).join(' ');
      root.querySelector('#flow-line').setAttribute('d', `M${points.replaceAll(' ', 'L')}`);
    }
  });
}
