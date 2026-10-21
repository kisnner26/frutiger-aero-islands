/**
 * aero royale en línea: salas por código sobre Supabase Realtime (solo difusión y presencia, sin tablas).
 * cada máquina manda sobre su propio jugador; quien crea la sala manda además sobre los bots que rellenan los huecos.
 * el servidor no valida nada: es una sala entre amigos, no un modo competitivo con ranking.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { AvatarSpec } from '../../avatar/model';
import { isSupabaseConfigured, supabase } from '../../persistence/supabase';
import type { PickupKind } from './sim';

export interface Member { id: string; name: string; hue: number; spec: AvatarSpec | null; host: boolean }
export interface StartMsg { seed: number; roster: Array<{ id: string; name: string; hue: number; isBot: boolean }>; specs: Record<string, AvatarSpec | null> }
export interface StateMsg { id: string; x: number; y: number; vx: number; vy: number; aim: number; hp: number; shield: number; alive: boolean; rapid: number; speed: number }

export type NetMsg =
  | { k: 'start'; start: StartMsg }
  | { k: 'state'; s: StateMsg }
  | { k: 'bots'; list: StateMsg[] }
  | { k: 'shot'; owner: string; x: number; y: number; vx: number; vy: number; dmg?: number }
  | { k: 'hit'; victim: string; killer: string; dmg: number; dead: boolean }
  | { k: 'fall'; player: string }
  | { k: 'pickup'; id: number; player: string; kind: PickupKind };

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newRoomCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
export const netAvailable = () => isSupabaseConfigured && !!supabase;

export class RoyaleNet<M = NetMsg> {
  private ch: RealtimeChannel | null = null;
  members: Member[] = [];
  ready = false;

  constructor(
    readonly code: string,
    private me: Member,
    private on: { members: (m: Member[]) => void; msg: (m: M) => void; error: (e: string) => void },
    private prefix = 'royale',
  ) {}

  async join(): Promise<void> {
    if (!supabase) throw new Error('sin servidor');
    const ch = supabase.channel(`${this.prefix}:${this.code}`, { config: { broadcast: { self: false, ack: false }, presence: { key: this.me.id } } });
    this.ch = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, Array<Member>>;
      this.members = Object.values(state).map((v) => v[0]).filter(Boolean).sort((a, b) => (a.host === b.host ? a.id.localeCompare(b.id) : a.host ? -1 : 1));
      this.on.members(this.members);
    });
    ch.on('broadcast', { event: 'm' }, ({ payload }) => this.on.msg(payload as M));
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('tiempo agotado')), 12_000);
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timer);
          await ch.track(this.me);
          this.ready = true;
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          window.clearTimeout(timer);
          if (!this.ready) reject(new Error(status));
          else this.on.error(status);
        }
      });
    });
  }

  send(msg: M) {
    void this.ch?.send({ type: 'broadcast', event: 'm', payload: msg });
  }

  async close() {
    const ch = this.ch;
    this.ch = null;
    if (ch && supabase) {
      try {
        await ch.untrack();
      } catch {
        /* ya cerrado */
      }
      await supabase.removeChannel(ch);
    }
  }
}
