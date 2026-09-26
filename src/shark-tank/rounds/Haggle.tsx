import { useEffect, useRef, useState, type Dispatch } from 'react';
import { SHARKS, money, type SharkId } from '../data';
import type { Action, GameState, Offer } from '../game';
import { portrait } from '../pixel/sprites';
import { SEATS, glow, rect } from '../pixel/scenes';
import { sfx } from '../sfx';
import { At, SpeechBubble, Sprite } from '../components/ui';
import { PanelPortal, useFrame, useFx, useKeys, useStage, useTimers } from '../components/stage';
import { RoundBanner } from './common';
import { Stamp } from '../components/Cutscene';

/** The Sharks announce offers (or drop out) one at a time. */
export function OfferReveal({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const api = useStage();
  const later = useTimers();
  const [shown, setShown] = useState(0);
  const count = s.offers.length;

  useEffect(() => {
    s.reveal.forEach((r, i) =>
      later(() => {
        const o = s.offers.find((x) => x.shark === r.shark);
        if (o) {
          api.react(r.shark, { kind: 'offer', text: money(o.amount), sub: `${o.equity}%` }, 60000);
          sfx('offer');
        } else {
          api.react(r.shark, { kind: 'out' }, 60000);
          sfx('out');
        }
        setShown(i + 1);
      }, 700 + i * 850),
    );
    later(() => dispatch({ type: 'next' }), 700 + s.reveal.length * 850 + 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {shown >= s.reveal.length && (
        <div className="st-center">
          <Stamp text={count ? `${count} offer${count > 1 ? 's' : ''}!` : 'No offers'} tone={count ? 'gold' : 'red'} />
        </div>
      )}
      <PanelPortal>
        <div className="st-card st-game">
          <div className="st-tab">The offers</div>
          <div className="st-offer-chips">
            {s.reveal.slice(0, shown).map((r) => {
              const o = s.offers.find((x) => x.shark === r.shark);
              return (
                <span key={r.shark} className={`st-chip-offer ${o ? '' : 'is-out'}`}>
                  <Sprite img={portrait(r.shark, o ? 'happy' : 'angry')} scale={1} className="st-face" />
                  {o ? `${money(o.amount)} · ${o.equity}%` : 'Out'}
                </span>
              );
            })}
            {shown < s.reveal.length && <span className="st-muted">The Sharks are deciding…</span>}
          </div>
        </div>
      </PanelPortal>
    </>
  );
}

const PULL = 2.4; // equity points per second while you hold
const COOL = 10; // temper points per second when you let go

function terms(o: Offer) {
  return o.royalty ? '+ $1/unit royalty' : o.loan ? `${money(o.loan)} of it as a loan` : 'Straight equity';
}

/** Round 4: hold to drag a Shark's equity down while their temper climbs. Shake before they snap. */
export function HaggleRound({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const api = useStage();
  const [stage, setStage] = useState<'intro' | 'play'>('intro');
  const [sel, setSel] = useState<SharkId>(s.offers[0]?.shark);
  const [confirmWalk, setConfirmWalk] = useState(false);
  const sRef = useRef(s);
  sRef.current = s;
  const h = useRef({
    eq: Object.fromEntries(s.offers.map((o) => [o.shark, o.equity])) as Record<SharkId, number>,
    temper: Object.fromEntries(s.offers.map((o) => [o.shark, 0])) as Record<SharkId, number>,
    holding: false,
    lastGrumble: 0,
    now: 0,
  });
  const marker = useRef<HTMLSpanElement>(null);
  const eqLabel = useRef<HTMLElement>(null);
  const shakeLabel = useRef<HTMLSpanElement>(null);
  const temperFill = useRef<HTMLSpanElement>(null);

  const offer = s.offers.find((o) => o.shark === sel) ?? s.offers[0];

  // keep the selection valid when a Shark walks
  useEffect(() => {
    if (offer && offer.shark !== sel) setSel(offer.shark);
  }, [offer, sel]);

  useFrame((t, dt) => {
    const st = h.current;
    st.now = t;
    if (stage !== 'play' || !offer) return;
    const sec = dt / 1000;
    const id = offer.shark;
    Object.keys(st.temper).forEach((k) => {
      const key = k as SharkId;
      if (key !== id || !st.holding) st.temper[key] = Math.max(0, st.temper[key] - COOL * sec);
    });
    if (st.holding) {
      st.eq[id] = Math.max(offer.floor, st.eq[id] - PULL * sec);
      const below = st.eq[id] < offer.minEquity;
      st.temper[id] += ((below ? 58 : 15) / Math.sqrt(offer.patience)) * sec;
      if (st.temper[id] > 65 && t - st.lastGrumble > 1400) {
        st.lastGrumble = t;
        api.react(id, { kind: 'angry' }, 1000);
      }
      if (st.temper[id] >= 100) {
        st.holding = false;
        api.pop('Too greedy!', SEATS[id].x, SEATS[id].top - 16, 'bad');
        api.shake();
        dispatch({ type: 'sharkWalks', shark: id });
        return;
      }
    }
    const span = Math.max(1, offer.equity - offer.floor);
    const pct = ((st.eq[id] - offer.floor) / span) * 100;
    if (marker.current) marker.current.style.left = `${pct}%`;
    const shown = Math.round(st.eq[id]);
    if (eqLabel.current) eqLabel.current.textContent = `${shown}%`;
    if (shakeLabel.current) shakeLabel.current.textContent = `Shake at ${shown}%`;
    if (temperFill.current) {
      temperFill.current.style.width = `${Math.min(100, st.temper[id])}%`;
      temperFill.current.dataset.hot = st.temper[id] > 65 ? '1' : '0';
    }
  });

  const shakeHands = () => {
    if (stage !== 'play' || !offer) return;
    const st = h.current;
    st.holding = false;
    const eq = Math.round(st.eq[offer.shark]);
    if (eq >= offer.minEquity) {
      sfx('confirm');
      dispatch({ type: 'shake', shark: offer.shark, equity: eq });
      return;
    }
    // too low: they refuse and bounce the number back up
    st.temper[offer.shark] += 30;
    st.eq[offer.shark] += (offer.minEquity - st.eq[offer.shark]) * 0.6;
    api.react(offer.shark, { kind: 'angry' }, 1100);
    api.pop('No way.', SEATS[offer.shark].x, SEATS[offer.shark].top - 16, 'bad');
    api.shake();
    sfx('bad');
  };

  const hold = (on: boolean) => {
    if (stage !== 'play') return;
    if (on && !h.current.holding) sfx('select');
    h.current.holding = on;
  };

  useKeys(
    (e) => {
      if (stage !== 'play') return;
      if (e.key === ' ' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!e.repeat) hold(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        shakeHands();
      } else if (/^[1-5]$/.test(e.key)) {
        const o = s.offers[Number(e.key) - 1];
        if (o) {
          hold(false);
          setSel(o.shark);
        }
      }
    },
    (e) => {
      if (e.key === ' ' || e.key.toLowerCase() === 'a') hold(false);
    },
  );

  // sweat and a spotlight on the Shark you're working on
  useFx((c, t) => {
    if (stage !== 'play' || !offer) return;
    const seat = SEATS[offer.shark];
    const temper = h.current.temper[offer.shark];
    glow(c, seat.x, seat.top + 30, 30, '#ffe7a0', 0.08, 3);
    if (temper > 30) {
      const n = temper > 70 ? 3 : temper > 50 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const k = ((t / 500 + i * 0.33) % 1);
        rect(c, seat.x + 10 + i * 3, seat.top + 6 + k * 10, 1, 2, '#8ad8f0');
      }
    }
    if (temper > 80 && Math.floor(t / 90) % 2) {
      rect(c, seat.x - 12, seat.top - 4, 2, 2, '#c8452f');
      rect(c, seat.x + 10, seat.top - 6, 2, 2, '#c8452f');
    }
  });

  if (stage === 'intro')
    return (
      <RoundBanner
        n={4}
        title="The Haggle"
        hint="Hold A to push their equity down. Don't make them snap."
        onDone={() => {
          api.clearReactions();
          setStage('play');
        }}
      />
    );
  if (!offer) return null;

  return (
    <>
      {s.offers.map((o) => (
        <At key={o.shark} x={SEATS[o.shark].x} y={SEATS[o.shark].top - 2}>
          <button
            type="button"
            className={`st-bubble-btn ${o.shark === offer.shark ? 'is-on' : ''}`}
            onClick={() => {
              hold(false);
              setSel(o.shark);
            }}
            aria-label={`Haggle with ${SHARKS[o.shark].name}`}
          >
            <SpeechBubble bubble={{ kind: 'offer', text: money(o.amount), sub: `${o.equity}%` }} />
          </button>
        </At>
      ))}
      <PanelPortal>
        <div className="st-card st-game st-haggle">
          <div className="st-tab">Round 4 · The Haggle</div>
          <div className="st-offer-chips">
            {s.offers.map((o, i) => (
              <button
                key={o.shark}
                type="button"
                className={`st-chip-offer ${o.shark === offer.shark ? 'is-on' : ''}`}
                onClick={() => {
                  hold(false);
                  setSel(o.shark);
                }}
              >
                <Sprite img={portrait(o.shark, 'happy')} scale={1} className="st-face" />
                <span>
                  {i + 1}. {SHARKS[o.shark].short}
                </span>
              </button>
            ))}
          </div>
          <div className="st-haggle-head">
            <b>{SHARKS[offer.shark].name}</b>
            <span className="st-muted">
              {money(offer.amount)} · {terms(offer)}
            </span>
          </div>
          <div className="st-tug" aria-hidden="true">
            <span className="st-tug-end">{offer.floor}%</span>
            <div className="st-tug-track">
              <span ref={marker} className="st-tug-mark" style={{ left: '100%' }}>
                <b ref={eqLabel}>{offer.equity}%</b>
              </span>
            </div>
            <span className="st-tug-end">{offer.equity}%</span>
          </div>
          <div className="st-temper">
            <span>Temper</span>
            <div className="st-temper-track">
              <span ref={temperFill} className="st-temper-fill" />
            </div>
          </div>
          <div className="st-card-foot">
            {confirmWalk ? (
              <>
                <span className="st-muted">Leave every offer?</span>
                <button type="button" className="st-btn" onClick={() => setConfirmWalk(false)}>
                  Stay
                </button>
                <button type="button" className="st-btn is-red" onClick={() => dispatch({ type: 'walk' })}>
                  Walk away
                </button>
              </>
            ) : (
              <>
                <button type="button" className="st-link" onClick={() => setConfirmWalk(true)}>
                  Walk away
                </button>
                <button
                  type="button"
                  className="st-btn is-hold"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    hold(true);
                  }}
                  onPointerUp={() => hold(false)}
                  onPointerCancel={() => hold(false)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className="st-abtn" aria-hidden="true">
                    A
                  </span>
                  Hold to haggle
                </button>
                <button type="button" className="st-btn is-teal" onClick={shakeHands}>
                  <span ref={shakeLabel}>Shake at {offer.equity}%</span>
                </button>
              </>
            )}
          </div>
        </div>
      </PanelPortal>
    </>
  );
}
