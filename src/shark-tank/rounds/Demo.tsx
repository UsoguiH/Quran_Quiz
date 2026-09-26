import { useRef, useState, type Dispatch } from 'react';
import { PRODUCTS, SHARKS, SHARK_ORDER, type SharkId } from '../data';
import { SAMPLES, type Action, type GameState } from '../game';
import { INK, productSprite } from '../pixel/sprites';
import { H, SEATS, W, blit, rect } from '../pixel/scenes';
import { sfx } from '../sfx';
import { APrompt, Sprite } from '../components/ui';
import { PanelPortal, isConfirm, useFrame, useFx, useKeys, useStage, useTimers } from '../components/stage';
import { RoundBanner } from './common';

interface Toss {
  from: { x: number; y: number };
  to: { x: number; y: number };
  t0: number;
}

const FLIGHT = 520;
const HAND = { x: 350, y: 186 };

function ring(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) {
  for (let d = -r; d <= r; d++) {
    const e = Math.round(Math.sqrt(r * r - d * d));
    rect(c, cx + e, cy + d, 1, 1, col);
    rect(c, cx - e, cy + d, 1, 1, col);
    rect(c, cx + d, cy + e, 1, 1, col);
    rect(c, cx + d, cy - e, 1, 1, col);
  }
}

function sharkAt(x: number, y: number, out: (id: SharkId) => boolean): SharkId | null {
  for (const id of SHARK_ORDER) {
    const s = SEATS[id];
    if (!out(id) && Math.abs(x - s.x) <= 17 && y >= s.top + 2 && y <= s.top + 52) return id;
  }
  return null;
}

/** Round 2: aim a wobbling reticle and toss samples to the Sharks. */
export function DemoRound({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const api = useStage();
  const later = useTimers();
  const [stage, setStage] = useState<'intro' | 'play' | 'end'>('intro');
  const [thrown, setThrown] = useState(0);
  const g = useRef({
    aim: { x: 192, y: 96 },
    ret: { x: 192, y: 96 },
    keys: new Set<string>(),
    toss: null as Toss | null,
    litter: [] as { x: number; y: number }[],
    now: 0,
  });
  const sRef = useRef(s);
  sRef.current = s;
  const wobble = 3 + (5 - s.nerve) * 2.2;
  const p = PRODUCTS[s.product];

  useFrame((t, dt) => {
    const st = g.current;
    st.now = t;
    if (stage !== 'play') return;
    const step = 140 * (dt / 1000);
    if (st.keys.has('ArrowLeft')) st.aim.x -= step;
    if (st.keys.has('ArrowRight')) st.aim.x += step;
    if (st.keys.has('ArrowUp')) st.aim.y -= step;
    if (st.keys.has('ArrowDown')) st.aim.y += step;
    st.aim.x = Math.max(10, Math.min(W - 10, st.aim.x));
    st.aim.y = Math.max(20, Math.min(170, st.aim.y));
    st.ret = {
      x: st.aim.x + Math.sin(t / 260) * wobble,
      y: st.aim.y + Math.cos(t / 340) * wobble * 0.7,
    };
    if (st.toss && t - st.toss.t0 >= FLIGHT) land(st.toss);
  });

  const land = (toss: Toss) => {
    const st = g.current;
    st.toss = null;
    const hit = sharkAt(toss.to.x, toss.to.y, (id) => sRef.current.sharks[id].out);
    dispatch({ type: 'demo', shark: hit });
    if (hit) {
      const loves = SHARKS[hit].loves.includes(p.category);
      const repeat = sRef.current.caught.includes(hit);
      api.react(hit, { kind: loves && !repeat ? 'love' : 'happy' }, 1300);
      api.pop(repeat ? 'Caught' : loves ? 'Loves it!' : 'Caught!', SEATS[hit].x, SEATS[hit].top - 18, repeat ? 'good' : 'gold');
      sfx('good');
    } else {
      st.litter.push({ x: toss.to.x, y: Math.max(toss.to.y, 150) + Math.random() * 30 });
      api.pop('Miss', toss.to.x, toss.to.y, 'bad');
      sfx('bad');
    }
    const n = sRef.current.stats.throws + 1;
    setThrown(n);
    if (n >= SAMPLES) {
      setStage('end');
      later(() => dispatch({ type: 'next' }), 1100);
    }
  };

  const toss = () => {
    const st = g.current;
    if (stage !== 'play' || st.toss || sRef.current.stats.throws >= SAMPLES) return;
    st.toss = { from: HAND, to: { ...st.ret }, t0: st.now };
    sfx('select');
  };

  useFx((c) => {
    const st = g.current;
    const img = productSprite(s.product);
    st.litter.forEach((l) => blit(c, img, l.x - 6, Math.min(H - 14, l.y), 1));
    if (st.toss) {
      const k = Math.min(1, (st.now - st.toss.t0) / FLIGHT);
      const x = st.toss.from.x + (st.toss.to.x - st.toss.from.x) * k;
      const y = st.toss.from.y + (st.toss.to.y - st.toss.from.y) * k - Math.sin(k * Math.PI) * 46;
      const sc = Math.max(1, Math.round(3 - k * 2));
      blit(c, img, x - 6 * sc, y - 6 * sc, sc);
    } else if (stage === 'play') {
      const { x, y } = st.ret;
      const over = sharkAt(x, y, (id) => sRef.current.sharks[id].out);
      const col = over ? '#5fd0b3' : '#fbf3dc';
      ring(c, x, y, 8, INK);
      ring(c, x, y, 7, col);
      ring(c, x, y, 6, INK);
      rect(c, x - 12, y, 5, 1, col);
      rect(c, x + 8, y, 5, 1, col);
      rect(c, x, y - 12, 1, 5, col);
      rect(c, x, y + 8, 1, 5, col);
      rect(c, x - 1, y - 1, 3, 3, col);
    }
  });

  useKeys(
    (e) => {
      if (stage !== 'play') return;
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        g.current.keys.add(e.key);
      } else if (isConfirm(e) && !e.repeat) {
        e.preventDefault();
        toss();
      }
    },
    (e) => g.current.keys.delete(e.key),
  );

  if (stage === 'intro')
    return (
      <RoundBanner
        n={2}
        title="The Demo"
        hint="Aim and toss samples to the Sharks"
        onDone={() => setStage('play')}
      />
    );

  const aimAt = (e: React.PointerEvent) => {
    const a = api.toArt(e.clientX, e.clientY);
    if (a) g.current.aim = { x: a.x, y: Math.min(170, a.y) };
  };

  const fans = SHARK_ORDER.filter((id) => SHARKS[id].loves.includes(p.category)).map((id) => SHARKS[id].short);
  return (
    <>
      <div
        className="st-aimpad"
        onPointerMove={aimAt}
        onPointerDown={(e) => {
          aimAt(e);
          if (e.pointerType !== 'mouse') return;
          g.current.ret = { ...g.current.aim };
          toss();
        }}
        onPointerUp={(e) => {
          if (e.pointerType === 'mouse') return;
          g.current.ret = { ...g.current.aim };
          toss();
        }}
      />
      <PanelPortal>
        <div className="st-card st-game">
          <div className="st-tab">Round 2 · The Demo</div>
          <div className="st-samples" aria-label={`${SAMPLES - thrown} samples left`}>
            {Array.from({ length: SAMPLES }, (_, i) => (
              <Sprite key={i} img={productSprite(s.product)} scale={2} className={i < thrown ? 'is-used' : ''} />
            ))}
          </div>
          <p className="st-game-note">
            {fans.length ? `${fans.join(' and ')} love ${p.category} products. ` : ''}Your nerve sets the wobble.
          </p>
          <div className="st-card-foot">
            <span className="st-muted">Arrows or mouse to aim</span>
            <APrompt label="Toss" onClick={toss} />
          </div>
        </div>
      </PanelPortal>
    </>
  );
}
