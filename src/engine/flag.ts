import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { flagCloth } from '../world/flags';

const STRIPS = 10;

/** bandera sobre un asta con un finalizador de cristal; el paño ondea con tiras desfasadas. */
export class WavingFlag extends Container {
  private strips: Sprite[] = [];
  private poleH: number;
  private clothW: number;
  private clothH: number;
  private textures: Texture[] = [];

  constructor(code: string, opts: { pole?: number; cloth?: number } = {}) {
    super();
    this.poleH = opts.pole ?? 90;
    this.clothW = opts.cloth ?? 64;
    this.clothH = (this.clothW * 2) / 3;

    const shadow = new Graphics();
    shadow.ellipse(0, 2, this.clothW * 0.22, this.clothW * 0.07).fill({ color: 0x16301f, alpha: 0.3 });
    const pole = new Graphics();
    pole.moveTo(0, 0).lineTo(0, -this.poleH).stroke({ width: this.clothW * 0.07 + 1.5, color: 0x4a5a6e });
    pole.moveTo(-0.6, 0).lineTo(-0.6, -this.poleH).stroke({ width: this.clothW * 0.035 + 0.8, color: 0xe8f2fa });
    const knob = new Graphics();
    knob.circle(0, -this.poleH - 3, this.clothW * 0.09 + 1).fill({ color: 0xbfe8ff }).stroke({ width: 1, color: 0xffffff });
    knob.circle(-1.2, -this.poleH - 4.5, this.clothW * 0.03 + 0.6).fill({ color: 0xffffff });
    this.addChild(shadow, pole, knob);

    const canvas = flagCloth(code, 192);
    const base = Texture.from(canvas);
    const sw = canvas.width / STRIPS;
    for (let i = 0; i < STRIPS; i++) {
      const tex = new Texture({ source: base.source, frame: new Rectangle(i * sw, 0, sw, canvas.height) });
      this.textures.push(tex);
      const s = new Sprite(tex);
      s.width = this.clothW / STRIPS + 0.6;
      s.height = this.clothH;
      s.x = (i * this.clothW) / STRIPS;
      s.y = -this.poleH + 2;
      this.strips.push(s);
      this.addChild(s);
    }
    this.update(0, true);
  }

  update(t: number, still = false) {
    this.strips.forEach((s, i) => {
      const amp = (i / (STRIPS - 1)) * 2.6 + 0.2;
      const phase = still ? i * 0.7 : t * 3.2 + i * 0.7;
      s.y = -this.poleH + 2 + Math.sin(phase) * amp;
      s.skew.y = Math.cos(phase) * 0.09 * (i / STRIPS);
    });
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.textures.forEach((t) => t.destroy(false));
    super.destroy(options);
  }
}
