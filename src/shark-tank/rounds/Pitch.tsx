import { useRef, useState, type Dispatch } from 'react';
import { money } from '../data';
import { PITCH_BEATS, inSharks, type Action, type GameState, type PitchGrade } from '../game';
import { sfx } from '../sfx';
import { APrompt } from '../components/ui';
import { PanelPortal, isConfirm, useFrame, useKeys, useStage, useTimers } from '../components/stage';
import { RoundBanner, pick } from './common';

const SPEED = [0.7, 0.95, 1.25];

/** Round 1: stop the swinging marker in the gold zone, three times. */
export function PitchRound({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const api = useStage();
  const later = useTimers();
  const [stage, setStage] = useState<'intro' | 'play' | 'end'>('intro');
  const [beat, setBeat] = useState(0);
  const [zone, setZone] = useState(0.5);
  const [locked, setLocked] = useState(false);
  const marker = useRef<HTMLSpanElement>(null);
  const m = useRef({ p: 0, dir: 1 });

  const perfect = 0.03 + s.nerve * 0.006;
  const good = perfect * 2.6;
  const beats = [
    { label: 'The Hook', note: 'Grab their attention' },
    { label: 'The Product', note: 'Show what it does' },
    { label: 'The Ask', note: `${money(s.ask.amount)} for ${s.ask.equity}%` },
  ];

  useFrame((_, dt) => {
    if (stage !== 'play' || locked) return;
    const st = m.current;
    st.p += st.dir * SPEED[beat] * (dt / 1000);
    if (st.p > 1) {
      st.p = 2 - st.p;
      st.dir = -1;
    } else if (st.p < 0) {
      st.p = -st.p;
      st.dir = 1;
    }
    if (marker.current) marker.current.style.left = `${st.p * 100}%`;
  });

  const press = () => {
    if (stage !== 'play' || locked) return;
    const off = Math.abs(m.current.p - zone);
    const grade: PitchGrade = off <= perfect ? 'perfect' : off <= good ? 'good' : 'miss';
    dispatch({ type: 'pitch', grade });
    setLocked(true);
    const live = inSharks(s);
    live.forEach((id) => {
      const kind =
        grade === 'perfect'
          ? pick(['love', 'happy'] as const)
          : grade === 'good'
            ? pick(['happy', 'meh'] as const)
            : pick(['meh', 'angry'] as const);
      api.react(id, { kind }, 1200);
    });
    if (grade === 'perfect') {
      sfx('good');
      api.pop('Perfect!', 192, 120, 'gold');
    } else if (grade === 'good') {
      sfx('blip');
      api.pop('Good', 192, 120, 'good');
    } else {
      sfx('bad');
      api.shake();
      api.pop('Stumbled', 192, 120, 'bad');
    }
    later(() => {
      if (beat + 1 >= PITCH_BEATS) {
        setStage('end');
        later(() => dispatch({ type: 'next' }), 500);
        return;
      }
      setBeat(beat + 1);
      setZone(0.25 + Math.random() * 0.5);
      m.current = { p: 0, dir: 1 };
      setLocked(false);
    }, 1100);
  };

  useKeys((e) => {
    if (stage === 'play' && isConfirm(e) && !e.repeat) {
      e.preventDefault();
      press();
    }
  });

  if (stage === 'intro')
    return (
      <RoundBanner
        n={1}
        title="The Pitch"
        hint="Press A when the marker hits the gold"
        onDone={() => {
          setZone(0.3 + Math.random() * 0.4);
          setStage('play');
        }}
      />
    );

  const grades = s.stats.pitch;
  return (
    <PanelPortal>
      <div className="st-card st-game">
        <div className="st-tab">Round 1 · The Pitch</div>
        <div className="st-beats">
          {beats.map((b, i) => (
            <span key={b.label} className={`st-beat ${i === beat ? 'is-now' : ''} ${grades[i] ? `is-${grades[i]}` : ''}`}>
              {b.label}
            </span>
          ))}
        </div>
        <p className="st-game-note">{beats[Math.min(beat, 2)].note}</p>
        <button type="button" className="st-timing" onClick={press} aria-label="Pitch now">
          <span className="st-zone is-good" style={{ left: `${(zone - good) * 100}%`, width: `${good * 200}%` }} />
          <span className="st-zone is-perfect" style={{ left: `${(zone - perfect) * 100}%`, width: `${perfect * 200}%` }} />
          <span ref={marker} className="st-marker" />
        </button>
        <div className="st-card-foot">
          <span className="st-muted">Steadier nerve widens the gold</span>
          <APrompt label="Pitch!" onClick={press} />
        </div>
      </div>
    </PanelPortal>
  );
}
