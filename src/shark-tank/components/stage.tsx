import { createContext, useContext, useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { SharkId } from '../data';
import type { Bubble } from '../game';

type Ctx = CanvasRenderingContext2D;

/** Something a round or cutscene paints on the canvas each frame. */
export interface Fx {
  draw: (c: Ctx, t: number) => void;
  /** Paint instead of the scene (cutscenes) rather than on top of it. */
  replace?: boolean;
}

export type PopTone = 'good' | 'gold' | 'bad';

export interface StageApi {
  fx: MutableRefObject<Fx | null>;
  react: (id: SharkId, b: Bubble, ms?: number) => void;
  clearReactions: () => void;
  pop: (text: string, x: number, y: number, tone?: PopTone) => void;
  shake: () => void;
  toArt: (clientX: number, clientY: number) => { x: number; y: number } | null;
  panelEl: HTMLElement | null;
  reduced: boolean;
}

export const StageCtx = createContext<StageApi | null>(null);

export function useStage(): StageApi {
  const api = useContext(StageCtx);
  if (!api) throw new Error('useStage outside the stage');
  return api;
}

/** Runs a callback every animation frame while mounted. */
export function useFrame(cb: (t: number, dt: number) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      ref.current(t, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/** Registers a canvas painter for as long as the component is mounted. */
export function useFx(draw: (c: Ctx, t: number) => void, replace = false) {
  const { fx } = useStage();
  const ref = useRef(draw);
  ref.current = draw;
  useEffect(() => {
    const mine: Fx = { draw: (c, t) => ref.current(c, t), replace };
    fx.current = mine;
    return () => {
      if (fx.current === mine) fx.current = null;
    };
  }, [fx, replace]);
}

/** Renders round controls into the card area (over the stage, or under it in portrait). */
export function PanelPortal({ children }: { children: ReactNode }) {
  const { panelEl } = useStage();
  return panelEl ? createPortal(children, panelEl) : null;
}

export const isConfirm = (e: KeyboardEvent) => e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'a';

export function useKeys(down: (e: KeyboardEvent) => void, up?: (e: KeyboardEvent) => void) {
  const d = useRef(down);
  const u = useRef(up);
  d.current = down;
  u.current = up;
  useEffect(() => {
    const skip = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' && e.key !== 'Enter') return true;
      return tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ');
    };
    const onDown = (e: KeyboardEvent) => {
      if (!skip(e)) d.current(e);
    };
    const onUp = (e: KeyboardEvent) => u.current?.(e);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);
}

/** setTimeout that is cleared when the component unmounts. */
export function useTimers() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => ids.current.forEach((id) => window.clearTimeout(id)), []);
  return (fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms));
  };
}
