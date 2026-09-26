import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { PRODUCTS, PRODUCT_ORDER, SHARKS, SHARK_ORDER, money, type SharkId } from './data';
import { askValuation, initialState, reducer, type Bubble, type GameState, type Phase } from './game';
import { PixelStage, type StageView } from './components/PixelStage';
import { AskPanel, ProductPanel, ResultsPanel } from './components/panels';
import { APrompt, At, FinMeter, Plate, SpeechBubble, Sprite } from './components/ui';
import { StageCtx, type Fx, type PopTone, type StageApi } from './components/stage';
import { Cutscene, type Shot } from './components/Cutscene';
import { dealShots, introShots, laterShots, noDealShots, walkinShots } from './components/scripts';
import { PitchRound } from './rounds/Pitch';
import { DemoRound } from './rounds/Demo';
import { GrillRound } from './rounds/Grill';
import { HaggleRound, OfferReveal } from './rounds/Haggle';
import { H, SEATS, STANDS, W, type SceneId } from './pixel/scenes';
import { coinSprite } from './pixel/sprites';
import { setMuted, sfx } from './sfx';

const TANK_PHASES: Phase[] = ['pitch', 'demo', 'grill', 'offers', 'haggle'];
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
  if (phase === 'cut-walkin' || phase === 'cut-nodeal') return 'hallway';
  if (TANK_PHASES.includes(phase) || phase === 'cut-deal') return 'tank';
  return 'workshop';
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

interface Pop {
  id: number;
  text: string;
  x: number;
  y: number;
  tone: PopTone;
}

export default function App() {
  const [s, dispatch] = useReducer(reducer, undefined, () => initialState());
  const [best, setBest] = useState<string | null>(() => store.get(BEST_KEY));
  const [muted, setMute] = useState(() => store.get(MUTE_KEY) === '1');
  const reduced = useReducedMotion();
  const { w, h, portrait } = useLayout();
  const u = w / W;

  const fx = useRef<Fx | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);
  const [reactions, setReactions] = useState<Partial<Record<SharkId, { b: Bubble; n: number }>>>({});
  const [pops, setPops] = useState<Pop[]>([]);
  const [shaking, setShaking] = useState(false);
  const seq = useRef(0);

  useEffect(() => setMuted(muted), [muted]);

  const react = useCallback((id: SharkId, b: Bubble, ms = 1200) => {
    const n = ++seq.current;
    setReactions((r) => ({ ...r, [id]: { b, n } }));
    window.setTimeout(() => {
      setReactions((r) => {
        if (r[id]?.n !== n) return r;
        const next = { ...r };
        delete next[id];
        return next;
      });
    }, ms);
  }, []);

  const clearReactions = useCallback(() => setReactions({}), []);

  const pop = useCallback((text: string, x: number, y: number, tone: PopTone = 'good') => {
    const id = ++seq.current;
    setPops((p) => [...p, { id, text, x, y, tone }]);
    window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 950);
  }, []);

  const shake = useCallback(() => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), 320);
  }, []);

  const toArt = useCallback((cx: number, cy: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
  }, []);

  const api: StageApi = useMemo(
    () => ({ fx, react, clearReactions, pop, shake, toArt, panelEl, reduced }),
    [react, clearReactions, pop, shake, toArt, panelEl, reduced],
  );

  // new phase, clean slate for bubbles
  useEffect(() => {
    setReactions({});
  }, [s.phase]);

  // a Shark who goes out mid-round gets an OUT bubble
  const wasOut = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const live = s.phase === 'grill' || s.phase === 'haggle' || s.phase === 'demo' || s.phase === 'pitch';
    SHARK_ORDER.forEach((id) => {
      const out = s.sharks[id].out;
      if (live && out && !wasOut.current[id]) {
        react(id, { kind: 'out' }, 60000);
        sfx('out');
      }
      wasOut.current[id] = out;
    });
  }, [s.sharks, s.phase, react]);

  // remember the best grade on this device
  const savedFor = useRef<GameState['result']>(null);
  useEffect(() => {
    const r = s.result;
    if (!r || s.phase !== 'epilogue' || savedFor.current === r) return;
    savedFor.current = r;
    const prev = best ? GRADE_ORDER.indexOf(best[0]) : 99;
    if (GRADE_ORDER.indexOf(r.grade) <= prev) {
      const label = `${r.grade} · ${r.title}`;
      store.set(BEST_KEY, label);
      setBest(label);
    }
  }, [s.result, s.phase, best]);

  const toggleMute = () =>
    setMute((m) => {
      store.set(MUTE_KEY, m ? '0' : '1');
      return !m;
    });

  // global keys: mute and title start
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'm') {
        toggleMute();
        return;
      }
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      const confirm = e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'a';
      if (confirm && !e.repeat && s.phase === 'title') {
        e.preventDefault();
        sfx('confirm');
        dispatch({ type: 'start' });
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [s.phase]);

  const scene = sceneFor(s.phase);
  const inTank = TANK_PHASES.includes(s.phase);
  const isCut = s.phase.startsWith('cut-');

  const view: StageView = {
    scene,
    product: s.product,
    selected: s.phase === 'workshop' ? s.browse : s.product,
    focusOnly: s.phase === 'ask',
    sharks: s.sharks,
    speaking: null,
    celebrate: s.phase === 'epilogue' && !!s.deal && (s.result?.ratio ?? 0) >= 1.3,
    epilogue: s.phase === 'epilogue',
    boxes: s.result ? Math.round(Math.min(14, s.result.ratio * 4)) : 0,
    dealShark: s.deal?.shark ?? null,
    reducedMotion: reduced,
    hand: s.phase === 'pitch' ? 'cards' : s.phase === 'demo' ? 'sample' : 'none',
    caught: s.caught,
  };

  // cutscenes are built once, when their phase starts
  const shots: Shot[] | null = useMemo(() => {
    switch (s.phase) {
      case 'cut-intro':
        return introShots(view);
      case 'cut-walkin':
        return walkinShots(view);
      case 'cut-deal':
        return dealShots(view, s);
      case 'cut-nodeal':
        return noDealShots(view);
      case 'cut-later':
        return laterShots(view, s);
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  let panel: ReactNode = null;
  if (s.phase === 'workshop') panel = <ProductPanel s={s} dispatch={dispatch} />;
  else if (s.phase === 'ask') panel = <AskPanel s={s} dispatch={dispatch} />;
  else if (s.phase === 'epilogue') panel = <ResultsPanel s={s} best={best} dispatch={dispatch} />;

  let round: ReactNode = null;
  if (s.phase === 'pitch') round = <PitchRound s={s} dispatch={dispatch} />;
  else if (s.phase === 'demo') round = <DemoRound s={s} dispatch={dispatch} />;
  else if (s.phase === 'grill') round = <GrillRound s={s} dispatch={dispatch} />;
  else if (s.phase === 'offers') round = <OfferReveal s={s} dispatch={dispatch} />;
  else if (s.phase === 'haggle') round = <HaggleRound s={s} dispatch={dispatch} />;

  const style = {
    '--u': `${u}px`,
    '--ui': portrait ? '2.4px' : `${Math.max(u, 2.3)}px`,
    '--stage-w': `${w}px`,
    '--stage-h': `${h}px`,
  } as CSSProperties;

  return (
    <StageCtx.Provider value={api}>
      <div className={`st-root ${portrait ? 'is-portrait' : 'is-landscape'}`} style={style}>
        <main ref={stageRef} className={`st-stage ${shaking && !reduced ? 'is-shaking' : ''}`} aria-label="Shark Tank game">
          <PixelStage view={view} fx={fx} />
          <div className="st-overlay">
            {scene === 'title' && !isCut && <TitleOverlay best={best} onStart={() => dispatch({ type: 'start' })} />}

            {(s.phase === 'workshop' || s.phase === 'ask') &&
              PRODUCT_ORDER.map((id) => {
                if (s.phase === 'ask' && id !== s.product) return null;
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

            {inTank &&
              SHARK_ORDER.map((id) => {
                const seat = SEATS[id];
                const b = reactions[id];
                return (
                  <div key={id}>
                    {b && (
                      <At x={seat.x + (s.phase === 'haggle' ? 26 : 0)} y={seat.top + (s.phase === 'haggle' ? 14 : -2)}>
                        <SpeechBubble key={b.n} bubble={b.b} />
                      </At>
                    )}
                    <At x={seat.x} y={seat.top + 49} anchor="top">
                      <Plate dim={s.sharks[id].out}>
                        {s.sharks[id].out ? `${SHARKS[id].short} · out` : SHARKS[id].short}
                      </Plate>
                    </At>
                  </div>
                );
              })}

            {round}

            {pops.map((p) => (
              <At key={p.id} x={p.x} y={p.y} anchor="center">
                <span className={`st-pop is-${p.tone}`}>{p.text}</span>
              </At>
            ))}

            {inTank && (
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
              {inTank && <FinMeter value={s.nerve} />}
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

            {shots && <Cutscene key={s.phase} shots={shots} onDone={() => dispatch({ type: 'cutDone' })} />}

            {!portrait && (
              <div className="st-panel" ref={setPanelEl}>
                {panel}
              </div>
            )}
          </div>
          <div className="st-fade" key={isCut ? s.phase : scene} />
        </main>
        {portrait && (
          <div className="st-dock" ref={setPanelEl}>
            {panel}
            {!panel && !inTank && <PortraitHint phase={s.phase} />}
          </div>
        )}
      </div>
    </StageCtx.Provider>
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
  if (phase === 'title') return <p className="st-hint">Turn your phone sideways for the full view.</p>;
  return null;
}
