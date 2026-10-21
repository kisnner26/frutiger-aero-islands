const NS = 'http://www.w3.org/2000/svg';

export class UrinarySimulation {
  constructor(root) {
    this.root = root;
    this.layer = root.querySelector('#particle-layer');
    this.paths = {
      bloodLeft: root.querySelector('#blood-left'), bloodRight: root.querySelector('#blood-right'),
      veinLeft: root.querySelector('#vein-left'), veinRight: root.querySelector('#vein-right'),
      ureterLeft: root.querySelector('#ureter-left'), ureterRight: root.querySelector('#ureter-right'),
      urethra: root.querySelector('#urethra-path'), infection: root.querySelector('#infection-path'),
      nephronFilter: root.querySelector('#nephron-filter-path'), nephronTubule: root.querySelector('#nephron-tubule-path')
    };
    this.state = { water: 500, filter: 100, adh: 50, urine: 'normal', stone: false, infection: false, protein: false, prostate: false, bladder: 180, voiding: false, mineral: 65, citrate: 50, stoneType: 'calcio', stoneProgress: 0 };
    this.particles = [];
    this.lastTime = performance.now();
    this.spawnClock = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  setState(patch) { Object.assign(this.state, patch); this.renderState(); }

  void() {
    this.state.voiding = true;
    window.setTimeout(() => { this.state.voiding = false; }, 1600);
  }

  metrics() {
    const hydration = this.state.water / 500;
    const gfr = Math.round(125 * this.state.filter / 100);
    const obstruction = this.state.stone ? 0.58 : 1;
    const adhEffect = 1.45 - this.state.adh / 100;
    const prostateEffect = this.state.prostate ? .62 : 1;
    const flow = Math.max(0.12, (0.55 + hydration * 0.65) * this.state.filter / 100 * obstruction * adhEffect * prostateEffect);
    const stoneRisk = Math.max(0, Math.min(1, (this.state.mineral * .9 + Math.max(0, 500 - this.state.water) / 14 - this.state.citrate * .3) / 100));
    return { hydration, gfr, flow, stoneRisk };
  }

  renderState() {
    const colors = { clara: '#f5e7a0', normal: '#e8b84e', oscura: '#b76916', hematuria: '#b7433f' };
    this.root.style.setProperty('--urine', colors[this.state.urine]);
    this.root.querySelector('#stone-marker').style.opacity = this.state.stone ? '1' : '0';
    this.root.querySelector('#infection-halo').style.opacity = this.state.infection ? '1' : '0';
    this.root.querySelector('#protein-indicator').style.opacity = this.state.protein ? '1' : '0';
    this.root.querySelector('#prostate-halo').style.opacity = this.state.prostate ? '1' : '0';
    this.root.querySelector('#urethra-stricture').style.opacity = this.state.prostate ? '1' : '0';
    const kidneyStroke = this.state.infection ? '#ff516a' : 'rgba(49,215,234,.7)';
    this.root.querySelectorAll('.kidney-glow').forEach(node => { node.style.stroke = kidneyStroke; });
    this.renderStone();
  }

  renderStone() {
    const progress = this.state.stone ? this.state.stoneProgress : 0;
    const crystals = this.root.querySelector('#renal-crystals');
    crystals.style.opacity = String(Math.min(1, progress * 3));
    crystals.style.transformOrigin = '435px 345px';
    crystals.style.transform = `scale(${Math.max(.35, Math.min(1, progress * 1.7))})`;
    this.root.querySelector('#stone-core').setAttribute('r', String(Math.max(0, (progress - .24) * 24)));
    const marker = this.root.querySelector('#stone-marker');
    const migration = Math.max(0, Math.min(.58, (progress - .52) * 1.25));
    const ureter = this.paths.ureterLeft;
    const point = ureter.getPointAtLength(ureter.getTotalLength() * migration);
    marker.setAttribute('transform', `translate(${point.x} ${point.y})`);
    marker.style.opacity = progress > .52 ? String(Math.min(1, (progress - .52) * 5)) : '0';
    const obstructed = progress > .9;
    this.root.querySelector('#pressure-wave').style.opacity = obstructed ? '.7' : '0';
    this.root.querySelector('#hydronephrosis').style.opacity = obstructed ? String(Math.min(.85, .25 + (progress - .9) * 6)) : '0';
  }

  spawn(pathName, className, duration, reverse = false) {
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('r', className === 'particle-infection' ? '7' : '6');
    circle.setAttribute('class', className);
    this.layer.append(circle);
    this.particles.push({ node: circle, path: this.paths[pathName], progress: reverse ? 1 : 0, speed: (reverse ? -1 : 1) / duration });
  }

  frame(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    const { hydration, flow, stoneRisk } = this.metrics();
    if (!this.reducedMotion) {
      this.spawnClock += dt;
      const interval = Math.max(0.18, 0.62 - hydration * 0.12);
      if (this.spawnClock > interval) {
        this.spawnClock = 0;
        this.spawn('bloodLeft', 'particle-blood', 2.2); this.spawn('bloodRight', 'particle-blood', 2.2);
        this.spawn('veinLeft', 'particle-vein', 2.1); this.spawn('veinRight', 'particle-vein', 2.1);
        this.spawn('nephronFilter', 'particle-blood', 1.8); this.spawn('nephronTubule', 'particle-filtrate', 2.7);
        this.spawn('ureterLeft', 'particle-urine', 5.2 / Math.max(flow, .3)); this.spawn('ureterRight', 'particle-urine', 5.2 / Math.max(flow, .3));
        if (this.state.infection) this.spawn('infection', 'particle-infection', 7, true);
        if (this.state.protein && Math.random() > .45) this.spawn('ureterLeft', 'particle-protein', 4.8 / Math.max(flow, .3));
        if (this.state.voiding) this.spawn('urethra', 'particle-urine', .9);
      }
      this.particles = this.particles.filter(particle => {
        particle.progress += particle.speed * dt;
        if (particle.progress > 1 || particle.progress < 0) { particle.node.remove(); return false; }
        if (this.state.stoneProgress > .9 && particle.path === this.paths.ureterLeft && particle.progress > .58) particle.progress = .58;
        const point = particle.path.getPointAtLength(particle.path.getTotalLength() * particle.progress);
        particle.node.setAttribute('cx', point.x); particle.node.setAttribute('cy', point.y);
        return true;
      });
    }
    if (this.state.stone) this.state.stoneProgress = Math.min(1, this.state.stoneProgress + dt * (.025 + stoneRisk * .12));
    else this.state.stoneProgress = Math.max(0, this.state.stoneProgress - dt * .4);
    this.renderStone();
    const residual = this.state.prostate ? 145 : 35;
    if (this.state.voiding) this.state.bladder = Math.max(residual, this.state.bladder - dt * (this.state.prostate ? 52 : 135));
    else this.state.bladder = Math.min(520, this.state.bladder + dt * flow * 1.7);
    const fluid = this.root.querySelector('#bladder-fluid');
    const height = 24 + this.state.bladder / 520 * 190;
    fluid.setAttribute('y', String(930 - height)); fluid.setAttribute('height', String(height));
    this.root.dispatchEvent(new CustomEvent('simulationtick', { detail: { ...this.metrics(), bladder: this.state.bladder, residual, stoneProgress: this.state.stoneProgress } }));
    requestAnimationFrame(this.frame);
  }
}
