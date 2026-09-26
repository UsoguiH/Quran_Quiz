import { useRef, useState, type Dispatch } from 'react';
import { QTYPES, QTYPE_LABEL, SHARKS, type QType, type SharkId, type Strength } from '../data';
import { QUESTIONS, inSharks, strengthFor, type Action, type GameState } from '../game';
import { INK, Q_COLOR, qIcon } from '../pixel/sprites';
import { SEATS, blit, disc, rect } from '../pixel/scenes';
import { sfx } from '../sfx';
import { Dial, KeyBadge, Sprite } from '../components/ui';
import { PanelPortal, useFrame, useFx, useKeys, useStage, useTimers } from '../components/stage';
import { RoundBanner, pick } from './common';

interface Question {
  id: number;
  type: QType;
  shark: SharkId;
  strength: Strength;
  hp: number;
  t0: number;
  dur: number;
}

interface Burst {
  x: number;
  y: number;
  t0: number;
  col: string;
}

const TARGET = { x: 192, y: 196 };

function where(q: Question, t: number) {
  const k = Math.max(0, (t - q.t0) / q.dur);
  const s = SEATS[q.shark];
  const from = { x: s.x, y: s.top + 18 };
  return {
    k,
    x: from.x + (TARGET.x - from.x) * Math.pow(k, 1.3),
    y: from.y + (TARGET.y - from.y) * k - Math.sin(k * Math.PI) * 14,
    scale: 1 + Math.min(3, Math.floor(k * 3.6)),
  };
}

/** Round 3: questions fly at you; block each with the matching card before it lands. */
export function GrillRound({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const api = useStage();
  const later = useTimers();
  const [stage, setStage] = useState<'intro' | 'play' | 'end'>('intro');
  const [done, setDone] = useState(0);
  const [bad, setBad] = useState<QType | null>(null);
  const sRef = useRef(s);
  sRef.current = s;
  const g = useRef({
    qs: [] as Question[],
    bursts: [] as Burst[],
    spawned: 0,
    resolved: 0,
    next: 0,
    now: 0,
    seq: 0,
  });

  const resolve = () => {
    const st = g.current;
    st.resolved += 1;
    setDone(st.resolved);
    const noOne = inSharks(sRef.current).length === 0;
    if ((st.resolved >= QUESTIONS || noOne) && stage === 'play') {
      setStage('end');
      later(() => dispatch({ type: 'next' }), 1200);
    }
  };

  useFrame((t) => {
    const st = g.current;
    st.now = t;
    if (stage !== 'play') return;
    if (st.next === 0) st.next = t + 600;
    const live = inSharks(sRef.current);
    if (live.length === 0 && st.qs.length === 0 && st.resolved < QUESTIONS) {
      st.resolved = QUESTIONS - 1;
      resolve();
      return;
    }
    // spawn
    if (t >= st.next && st.spawned < QUESTIONS && st.qs.length < 2 && live.length) {
      const n = st.spawned;
      const shark = pick(live);
      const type = pick(SHARKS[shark].asks);
      const strength = strengthFor(sRef.current, type);
      st.qs.push({
        id: ++st.seq,
        type,
        shark,
        strength,
        hp: strength === 'weak' ? 2 : 1,
        t0: t,
        dur: Math.max(1800, 3000 - n * 140),
      });
      st.spawned += 1;
      st.next = t + Math.max(1100, 2100 - n * 120);
      api.react(shark, { kind: 'ask' }, 700);
      sfx('offer');
    }
    // anything that reached you lands a hit
    st.qs = st.qs.filter((q) => {
      if (where(q, t).k < 1) return true;
      dispatch({ type: 'grill', shark: q.shark, outcome: 'hit', strength: q.strength });
      api.react(q.shark, { kind: 'angry' }, 1200);
      api.pop('Ouch!', 192, 170, 'bad');
      api.shake();
      sfx('bad');
      resolve();
      return false;
    });
    st.bursts = st.bursts.filter((b) => t - b.t0 < 420);
  });

  const answer = (type: QType) => {
    const st = g.current;
    if (stage !== 'play' || !st.qs.length) return;
    const q = st.qs.reduce((a, b) => (where(a, st.now).k >= where(b, st.now).k ? a : b));
    const pos = where(q, st.now);
    if (q.type !== type) {
      dispatch({ type: 'grill', shark: q.shark, outcome: 'wrong', strength: q.strength });
      api.pop('Wrong card', pos.x, pos.y - 12, 'bad');
      sfx('bad');
      setBad(type);
      later(() => setBad(null), 350);
      return;
    }
    q.hp -= 1;
    st.bursts.push({ x: pos.x, y: pos.y, t0: st.now, col: Q_COLOR[q.type] });
    if (q.hp > 0) {
      q.t0 += q.dur * 0.18;
      api.pop('Again!', pos.x, pos.y - 12, 'good');
      sfx('blip');
      return;
    }
    st.qs = st.qs.filter((x) => x !== q);
    dispatch({ type: 'grill', shark: q.shark, outcome: 'nailed', strength: q.strength });
    api.react(q.shark, { kind: q.strength === 'weak' ? 'love' : 'happy' }, 1200);
    api.pop(q.strength === 'weak' ? 'Recovered!' : 'Nailed it!', pos.x, pos.y - 12, 'gold');
    sfx('good');
    resolve();
  };

  useFx((c) => {
    const st = g.current;
    st.qs.forEach((q) => {
      const { x, y, scale } = where(q, st.now);
      const r = 4 * scale + 3;
      if (q.hp > 1) disc(c, x, y, r + 2, '#c8452f');
      disc(c, x, y, r + 1, INK);
      disc(c, x, y, r, '#fbf3dc');
      blit(c, qIcon(q.type), x - 3.5 * scale, y - 3.5 * scale, scale);
      if (q.hp > 1) {
        rect(c, x - 3, y + r + 3, 2, 2, '#c8452f');
        rect(c, x + 1, y + r + 3, 2, 2, '#c8452f');
      }
    });
    st.bursts.forEach((b) => {
      const k = (st.now - b.t0) / 420;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        rect(c, b.x + Math.cos(a) * k * 26, b.y + Math.sin(a) * k * 20, 2, 2, i % 2 ? b.col : '#fbf3dc');
      }
    });
  });

  useKeys((e) => {
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i >= 0) answer(QTYPES[i]);
  });

  if (stage === 'intro')
    return (
      <RoundBanner
        n={3}
        title="The Grilling"
        hint="Block each question with the matching card"
        onDone={() => setStage('play')}
      />
    );

  return (
    <PanelPortal>
      <div className="st-card st-game st-grill">
        <Dial done={done} total={QUESTIONS} />
        <div className="st-tab">Round 3 · The Grilling</div>
        <div className="st-hand" role="group" aria-label="Answer cards">
          {QTYPES.map((q, i) => {
            const str = strengthFor(s, q);
            return (
              <button
                key={q}
                type="button"
                className={`st-qcard is-${q} ${bad === q ? 'is-bad' : ''}`}
                style={{ ['--tilt' as string]: `${(i - 1) * 5}deg` }}
                onClick={() => answer(q)}
              >
                <KeyBadge k={String(i + 1)} />
                <Sprite img={qIcon(q)} scale={4} />
                <b>{QTYPE_LABEL[q]}</b>
                <small className={`is-${str}`}>{str === 'weak' ? 'Weak spot ×2' : str === 'strong' ? 'Strong' : 'Solid'}</small>
              </button>
            );
          })}
        </div>
      </div>
    </PanelPortal>
  );
}
