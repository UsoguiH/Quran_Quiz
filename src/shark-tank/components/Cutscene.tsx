import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx, type SfxName } from '../sfx';
import { clamp01 } from '../pixel/cutscenes';
import { isConfirm, useFx, useKeys } from './stage';

type Ctx = CanvasRenderingContext2D;

export interface Shot {
  dur: number;
  /** k is 0..1 through the shot, t is the frame clock, ms is time since the shot began. */
  draw: (c: Ctx, k: number, t: number, ms: number) => void;
  caption?: ReactNode;
  sfx?: SfxName;
}

const HOLD_TO_SKIP = 450;

/** Plays a list of shots on the canvas, letterboxed, with captions laid over them. */
export function Cutscene({ shots, onDone }: { shots: Shot[]; onDone: () => void }) {
  const start = useRef<number | null>(null);
  const shown = useRef(-1);
  const done = useRef(false);
  const doneCb = useRef(onDone);
  doneCb.current = onDone;
  const [idx, setIdx] = useState(0);
  const [holding, setHolding] = useState<number | null>(null);
  const total = shots.reduce((n, s) => n + s.dur, 0);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    window.setTimeout(() => doneCb.current(), 0);
  };

  useFx((c, t) => {
    if (start.current === null) start.current = t;
    let el = t - start.current;
    let i = 0;
    while (i < shots.length - 1 && el >= shots[i].dur) {
      el -= shots[i].dur;
      i++;
    }
    const shot = shots[i];
    shot.draw(c, clamp01(el / shot.dur), t, el);
    if (i !== shown.current) {
      shown.current = i;
      if (shot.sfx) sfx(shot.sfx);
      setIdx(i);
    }
    if (t - start.current >= total) finish();
  }, true);

  // hold A (or the skip button) to skip
  useEffect(() => {
    if (holding === null) return;
    const id = window.setTimeout(finish, HOLD_TO_SKIP);
    return () => window.clearTimeout(id);
  }, [holding]);

  useKeys(
    (e) => {
      if (isConfirm(e) && !e.repeat) {
        e.preventDefault();
        setHolding(performance.now());
      }
    },
    (e) => {
      if (isConfirm(e)) setHolding(null);
    },
  );

  return (
    <div className="st-cutscene">
      <div className="st-letterbox is-top" />
      <div className="st-letterbox is-bottom" />
      <div className="st-cut-caption" key={idx}>
        {shots[idx]?.caption}
      </div>
      <button
        type="button"
        className={`st-skip ${holding !== null ? 'is-holding' : ''}`}
        onPointerDown={() => setHolding(performance.now())}
        onPointerUp={() => setHolding(null)}
        onPointerLeave={() => setHolding(null)}
        onClick={(e) => e.detail === 0 && finish()}
      >
        <span className="st-abtn" aria-hidden="true">
          A
        </span>
        Hold to skip
      </button>
    </div>
  );
}

/* ---------- caption pieces ---------- */

export function TitleCard({ big, small }: { big: string; small?: string }) {
  return (
    <div className="st-titlecard">
      <b>{big}</b>
      {small && <span>{small}</span>}
    </div>
  );
}

export function Stamp({ text, tone = 'gold', delay = 0 }: { text: string; tone?: 'gold' | 'teal' | 'red'; delay?: number }) {
  return (
    <div className={`st-stamp is-${tone}`} style={{ animationDelay: `${delay}ms` }}>
      {text}
    </div>
  );
}

export function NameCard({ name, title, color, side }: { name: string; title: string; color: string; side: 'left' | 'right' }) {
  return (
    <div className={`st-namecard is-${side}`} style={{ ['--accent' as string]: color }}>
      <b>{name}</b>
      <span>{title}</span>
    </div>
  );
}

export function CountUp({ to, ms, prefix = '' }: { to: number; ms: number; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * k * (2 - k)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return (
    <span>
      {prefix}
      {n.toLocaleString('en-US')}
    </span>
  );
}
