import { useEffect, useLayoutEffect, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PRODUCTS, PRODUCT_ORDER, SHARKS, SHARK_ORDER, money, type SharkId } from './data';
import { askValuation, initialState, reducer, type Bubble, type GameState, type Phase } from './game';
import { PixelStage, type StageView } from './components/PixelStage';
import {
  AskPanel,
  DialogPanel,
  NegotiatePanel,
  OpenerPanel,
  ProductPanel,
  QuestionPanel,
  ResultsPanel,
} from './components/panels';
import { APrompt, At, FinMeter, Plate, SpeechBubble, Sprite } from './components/ui';
import { DOOR, PRODUCER_POS, SEATS, STANDS, W, type SceneId } from './pixel/scenes';
import { coinSprite } from './pixel/sprites';
import { setMuted, sfx } from './sfx';

const TANK_PHASES: Phase[] = ['intro', 'opener', 'qa', 'offers', 'negotiate', 'deal'];
const GRADE_ORDER = ['S', 'A', 'B', 'C', 'D'];
const BEST_KEY = 'shark-tank.best';
const MUTE_KEY = 'shark-tank.muted';

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage is optional */
    }
  },
};

function sceneFor(phase: Phase): SceneId {
  if (phase === 'title') return 'title';
  if (phase === 'workshop' || phase === 'ask' || phase === 'epilogue') return 'workshop';
  if (phase === 'hallway' || phase === 'doors') return 'hallway';
  return 'tank';
}

function useLayout() {
  const [box, setBox] = useState({ w: 960, h: 540, portrait: false });
  useLayoutEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const portrait = vw / vh < 1.15;
      const w = portrait ? vw : Math.min(vw, (vh * 16) / 9);
      setBox({ w: Math.floor(w), h: Math.floor((w * 9) / 16), portrait });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return box;
}

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(m.matches);
    const on = () => setR(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return r;
}

export default function App() {
  const [s, dispatch] = useReducer(reducer, undefined, () => initialState());
  const [best, setBest] = useState<string | null>(() => store.get(BEST_KEY));
  const [muted, setMute] = useState(() => store.get(MUTE_KEY) === '1');
  const reduced = useReducedMotion();
  const { w, h, portrait } = useLayout();
  const u = w / W;

  useEffect(() => setMuted(muted), [muted]);

  // doors swing open, then cut into the Tank
  useEffect(() => {
    if (s.phase !== 'doors') return;
    sfx('door');
    const id = window.setTimeout(() => dispatch({ type: 'enterTank' }), reduced ? 300 : 1500);
    return () => window.clearTimeout(id);
  }, [s.phase, reduced]);

  // remember the best grade on this device
  const savedFor = useRef<GameState['result']>(null);
  useEffect(() => {
    const r = s.result;
    if (!r || savedFor.current === r) return;
    savedFor.current = r;
    const prev = best ? GRADE_ORDER.indexOf(best[0]) : 99;
    if (GRADE_ORDER.indexOf(r.grade) <= prev) {
      const label = `${r.grade} · ${r.title}`;
      store.set(BEST_KEY, label);
      setBest(label);
    }
  }, [s.result, best]);

  // global keys: mute, title start, hallway doors
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'm') {
        setMute((m) => {
          store.set(MUTE_KEY, m ? '0' : '1');
          return !m;
        });
        return;
      }
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      const confirm = e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'a';
      if (!confirm || e.repeat) return;
      if (s.phase === 'title') {
        e.preventDefault();
        sfx('confirm');
        dispatch({ type: 'start' });
      } else if (s.phase === 'hallway' && !s.queue.length) {
        e.preventDefault();
        dispatch({ type: 'openDoors' });
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [s.phase, s.queue.length]);

  const line = s.queue[0] ?? null;
  const scene = sceneFor(s.phase);
  const inTank = TANK_PHASES.includes(s.phase);

  const view: StageView = {
    scene,
    product: s.product,
    selected: s.phase === 'workshop' ? s.browse : s.product,
    focusOnly: s.phase === 'ask',
    sharks: s.sharks,
    speaking: line?.who ?? null,
    doorsOpening: s.phase === 'doors',
    celebrate: (s.phase === 'deal' || s.phase === 'epilogue') && !!s.deal,
    dim: s.phase === 'deal' && !s.deal,
    epilogue: s.phase === 'epilogue',
    boxes: s.result ? Math.round(Math.min(14, s.result.ratio * 4)) : 0,
    dealShark: s.deal?.shark ?? null,
    reducedMotion: reduced,
  };

  const bubbles: Partial<Record<SharkId, Bubble>> = {};
  if (line?.bubbles) Object.assign(bubbles, line.bubbles);
  else if (!line && s.phase === 'qa' && s.asker) bubbles[s.asker] = { kind: 'ask' };
  else if (!line && s.phase === 'negotiate')
    s.offers.forEach((o) => (bubbles[o.shark] = { kind: 'offer', text: money(o.amount), sub: `${o.equity}%` }));

  let panel: ReactNode = null;
  if (line) panel = <DialogPanel key={line.id} line={line} dispatch={dispatch} reduced={reduced} />;
  else if (s.phase === 'workshop') panel = <ProductPanel s={s} dispatch={dispatch} />;
  else if (s.phase === 'ask') panel = <AskPanel s={s} dispatch={dispatch} />;
  else if (s.phase === 'opener') panel = <OpenerPanel dispatch={dispatch} />;
  else if (s.phase === 'qa') panel = <QuestionPanel s={s} dispatch={dispatch} />;
  else if (s.phase === 'negotiate') panel = <NegotiatePanel key={s.seq} s={s} dispatch={dispatch} />;
  else if (s.phase === 'epilogue') panel = <ResultsPanel s={s} best={best} dispatch={dispatch} />;

  const toggleMute = () =>
    setMute((m) => {
      store.set(MUTE_KEY, m ? '0' : '1');
      return !m;
    });

  const style = {
    '--u': `${u}px`,
    '--ui': portrait ? '2.4px' : `${Math.max(u, 2.3)}px`,
    '--stage-w': `${w}px`,
    '--stage-h': `${h}px`,
  } as CSSProperties;

  return (
    <div className={`st-root ${portrait ? 'is-portrait' : 'is-landscape'}`} style={style}>
      <main className="st-stage" aria-label="Shark Tank game">
        <PixelStage view={view} />
        <div className="st-overlay">
          {scene === 'title' && <TitleOverlay best={best} onStart={() => dispatch({ type: 'start' })} />}

          {scene === 'workshop' &&
            s.phase !== 'epilogue' &&
            PRODUCT_ORDER.map((id) => {
              const shown = s.phase === 'workshop' || id === s.product;
              if (!shown) return null;
              return (
                <At key={id} x={STANDS[id]} y={66}>
                  <button
                    type="button"
                    className={`st-price ${id === view.selected ? 'is-on' : ''}`}
                    onClick={() => s.phase === 'workshop' && dispatch({ type: 'browse', id })}
                    aria-label={`${PRODUCTS[id].name}, ${money(PRODUCTS[id].price)}`}
                  >
                    {money(PRODUCTS[id].price)}
                  </button>
                </At>
              );
            })}

          {scene === 'hallway' && (
            <>
              {line?.who === 'producer' && (
                <At x={PRODUCER_POS.x} y={PRODUCER_POS.y - 4}>
                  <SpeechBubble bubble={{ kind: 'ask' }} />
                </At>
              )}
              <At x={PRODUCER_POS.x} y={PRODUCER_POS.y + 50} anchor="top">
                <Plate>Pia</Plate>
              </At>
              {s.phase === 'hallway' && !line && (
                <At x={DOOR.x + DOOR.w / 2} y={DOOR.y + 36} anchor="center">
                  <APrompt label="Enter" onClick={() => dispatch({ type: 'openDoors' })} />
                </At>
              )}
            </>
          )}

          {scene === 'tank' &&
            SHARK_ORDER.map((id) => {
              const seat = SEATS[id];
              const b = bubbles[id];
              return (
                <div key={id}>
                  {b && (
                    <At x={seat.x} y={seat.top - 2}>
                      <SpeechBubble bubble={b} />
                    </At>
                  )}
                  <At x={seat.x} y={seat.top + 49} anchor="top">
                    <Plate dim={s.sharks[id].out}>{s.sharks[id].out ? `${SHARKS[id].short} · out` : SHARKS[id].short}</Plate>
                  </At>
                </div>
              );
            })}

          {(inTank || s.phase === 'hallway' || s.phase === 'doors') && (
            <div className="st-hud-left">
              <div className="st-pill">
                <Sprite img={coinSprite()} scale={2} />
                <span>
                  {money(s.ask.amount)} for {s.ask.equity}%
                </span>
              </div>
              <span className="st-hud-sub">Valued at {money(askValuation(s.ask))}</span>
            </div>
          )}
          <div className="st-hud-right">
            {inTank && <FinMeter value={s.confidence} />}
            <button
              type="button"
              className="st-pill st-mute"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            >
              {muted ? 'Sound off' : 'Sound on'}
            </button>
          </div>

          {s.phase === 'doors' && !reduced && <div className="st-flash" />}
          {!portrait && panel && <div className="st-panel">{panel}</div>}
        </div>
        <div className="st-fade" key={`${scene}:${s.phase === 'epilogue'}`} />
      </main>
      {portrait && <div className="st-dock">{panel ?? <PortraitHint phase={s.phase} />}</div>}
    </div>
  );
}

function TitleOverlay({ best, onStart }: { best: string | null; onStart: () => void }) {
  return (
    <div className="st-title">
      <h1 className="st-logo">
        <span className="st-logo-top">Shark Tank</span>
        <span className="st-logo-sub">The Pitch</span>
      </h1>
      <APrompt
        label="Start"
        onClick={() => {
          sfx('confirm');
          onStart();
        }}
      />
      {best && <span className="st-pill is-small">Best run: {best}</span>}
    </div>
  );
}

function PortraitHint({ phase }: { phase: Phase }) {
  if (phase === 'hallway') return <p className="st-hint">Tap Enter on the doors when you're ready.</p>;
  if (phase === 'title') return <p className="st-hint">Turn your phone sideways for the full view.</p>;
  return null;
}
