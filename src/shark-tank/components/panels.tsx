import { useEffect, useRef, useState, type Dispatch } from 'react';
import {
  OPENERS,
  PRODUCTS,
  PRODUCT_ORDER,
  SHARKS,
  TOPIC_LABEL,
  fairValue,
  money,
  type AnswerKind,
  type SharkId,
} from '../data';
import {
  QUESTION_COUNT,
  askValuation,
  currentQuestion,
  greedOf,
  type Action,
  type GameState,
  type Line,
} from '../game';
import { coinSprite, portrait, productSprite } from '../pixel/sprites';
import { sfx } from '../sfx';
import { APrompt, Dial, KeyBadge, Sprite } from './ui';

type D = Dispatch<Action>;

const isConfirm = (e: KeyboardEvent) => e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'a';

function useKeys(handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' && e.key !== 'Enter') return;
      if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
      if (e.repeat && isConfirm(e)) return;
      ref.current(e);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
}

const speakerName = (who: Line['who']) => {
  if (who === 'you') return 'You';
  if (who === 'producer') return 'Pia · Producer';
  if (who === 'narrator') return null;
  return SHARKS[who].name;
};

/* ---------- dialog ---------- */

export function DialogPanel({ line, dispatch, reduced }: { line: Line; dispatch: D; reduced: boolean }) {
  const [shown, setShown] = useState(reduced ? line.text.length : 0);
  const done = shown >= line.text.length;

  useEffect(() => {
    if (line.sfx) sfx(line.sfx);
    if (reduced) {
      setShown(line.text.length);
      return;
    }
    setShown(0);
    const len = line.text.length;
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= len) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 22);
    return () => window.clearInterval(id);
  }, [line.id, line.text, line.sfx, reduced]);

  useEffect(() => {
    if (shown > 0 && shown < line.text.length && shown % 5 === 0) sfx('type');
  }, [shown, line.text.length]);

  const next = () => {
    if (!done) setShown(line.text.length);
    else {
      sfx('blip');
      dispatch({ type: 'advance' });
    }
  };
  useKeys((e) => {
    if (isConfirm(e)) {
      e.preventDefault();
      next();
    }
  });

  const name = speakerName(line.who);
  const tabClass = line.who === 'you' ? 'is-you' : line.who === 'producer' ? 'is-producer' : '';
  return (
    <div className="st-card st-dialog" onClick={next} role="group" aria-label="Dialog">
      {name && <div className={`st-tab ${tabClass}`}>{name}</div>}
      <p className={`st-dialog-text ${line.who === 'narrator' ? 'is-narrator' : ''}`} aria-live="polite">
        {line.text.slice(0, shown)}
        <span className="st-ghost">{line.text.slice(shown)}</span>
      </p>
      <div className="st-card-foot">
        <APrompt small label={done ? 'Continue' : 'Skip'} />
      </div>
    </div>
  );
}

/* ---------- workshop: product picker ---------- */

export function ProductPanel({ s, dispatch }: { s: GameState; dispatch: D }) {
  const p = PRODUCTS[s.browse];
  const idx = PRODUCT_ORDER.indexOf(s.browse);
  const go = (d: number) => {
    sfx('select');
    dispatch({ type: 'browse', id: PRODUCT_ORDER[(idx + d + PRODUCT_ORDER.length) % PRODUCT_ORDER.length] });
  };
  const choose = () => {
    sfx('confirm');
    dispatch({ type: 'pickProduct' });
  };
  useKeys((e) => {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (isConfirm(e)) {
      e.preventDefault();
      choose();
    }
  });
  const margin = Math.round((1 - p.cost / p.price) * 100);
  return (
    <div className="st-card st-product">
      <div className="st-tab">Prototype {idx + 1} of 3</div>
      <div className="st-product-head">
        <button type="button" className="st-arrow" onClick={() => go(-1)} aria-label="Previous product">
          ◀
        </button>
        <Sprite img={productSprite(p.id)} scale={3} />
        <div className="st-product-title">
          <h2>{p.name}</h2>
          <p>{p.tagline}</p>
        </div>
        <button type="button" className="st-arrow" onClick={() => go(1)} aria-label="Next product">
          ▶
        </button>
      </div>
      <dl className="st-stats">
        <div>
          <dt>12-mo sales</dt>
          <dd>{money(p.sales)}</dd>
        </div>
        <div>
          <dt>Growth</dt>
          <dd>{p.growth}%/mo</dd>
        </div>
        <div>
          <dt>Cost / price</dt>
          <dd>
            {money(p.cost)} / {money(p.price)}
          </dd>
        </div>
        <div>
          <dt>Margin</dt>
          <dd>{margin}%</dd>
        </div>
        <div>
          <dt>Patent</dt>
          <dd className="is-cap">{p.patent}</dd>
        </div>
      </dl>
      <div className="st-card-foot">
        <APrompt label={`Pitch ${p.name}`} onClick={choose} />
      </div>
    </div>
  );
}

/* ---------- ledger: the ask ---------- */

export function AskPanel({ s, dispatch }: { s: GameState; dispatch: D }) {
  const p = PRODUCTS[s.product];
  const val = askValuation(s.ask);
  const greed = greedOf(s);
  const verdict =
    greed < 0.95
      ? { label: 'Bargain', note: 'Sharks start warm.', cls: 'is-good' }
      : greed <= 1.15
        ? { label: 'Fair', note: 'Your numbers back this up.', cls: 'is-good' }
        : greed <= 1.6
          ? { label: 'Spicy', note: 'Expect to defend it.', cls: 'is-warn' }
          : { label: 'Greedy', note: 'Sharks start cold.', cls: 'is-bad' };
  const confirm = () => {
    sfx('confirm');
    dispatch({ type: 'confirmAsk' });
  };
  useKeys((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirm();
    } else if (e.key === 'Escape') dispatch({ type: 'back' });
  });
  const meter = Math.max(0, Math.min(1, greed / 2.2));
  return (
    <div className="st-card st-ask">
      <div className="st-tab">Your ask · {p.name}</div>
      <div className="st-ask-grid">
        <label className="st-slider" htmlFor="st-amount">
          <span>Amount</span>
          <b>{money(s.ask.amount)}</b>
          <input
            id="st-amount"
            type="range"
            min={50000}
            max={500000}
            step={25000}
            value={s.ask.amount}
            onChange={(e) => dispatch({ type: 'setAsk', amount: Number(e.target.value) })}
          />
        </label>
        <label className="st-slider" htmlFor="st-equity">
          <span>Equity</span>
          <b>{s.ask.equity}%</b>
          <input
            id="st-equity"
            type="range"
            min={5}
            max={40}
            step={1}
            value={s.ask.equity}
            onChange={(e) => dispatch({ type: 'setAsk', equity: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="st-valuation">
        <Sprite img={coinSprite()} scale={2} />
        <span>
          Valuation <b>{money(val)}</b>
        </span>
        <span className="st-muted">Your numbers justify about {money(fairValue(p))}</span>
      </div>
      <div className="st-meter" role="img" aria-label={`Shark-o-meter: ${verdict.label}`}>
        <div className="st-meter-bar">
          <span className="st-meter-mark" style={{ left: `${meter * 100}%` }} />
        </div>
        <span className={`st-verdict ${verdict.cls}`}>
          {verdict.label}. {verdict.note}
        </span>
      </div>
      <div className="st-card-foot">
        <button type="button" className="st-link" onClick={() => dispatch({ type: 'back' })}>
          ◀ Pick another product
        </button>
        <APrompt label="Walk to the Tank" onClick={confirm} />
      </div>
    </div>
  );
}

/* ---------- choices (opener, questions) ---------- */

interface Choice {
  key: string;
  label: string;
  tag?: string;
  onPick: () => void;
}

function ChoiceList({ choices }: { choices: Choice[] }) {
  const [cursor, setCursor] = useState(0);
  useKeys((e) => {
    if (e.key === 'ArrowDown') setCursor((c) => (c + 1) % choices.length);
    else if (e.key === 'ArrowUp') setCursor((c) => (c - 1 + choices.length) % choices.length);
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= choices.length) choices[Number(e.key) - 1].onPick();
    else if (isConfirm(e)) {
      e.preventDefault();
      choices[cursor].onPick();
    }
  });
  return (
    <ul className="st-choices">
      {choices.map((c, i) => (
        <li key={c.key}>
          <button
            type="button"
            className={`st-choice ${i === cursor ? 'is-on' : ''}`}
            onMouseEnter={() => setCursor(i)}
            onFocus={() => setCursor(i)}
            onClick={c.onPick}
          >
            <KeyBadge k={String(i + 1)} />
            <span className="st-choice-label">{c.label}</span>
            {c.tag && <span className={`st-chip is-${c.tag.toLowerCase()}`}>{c.tag}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function OpenerPanel({ dispatch }: { dispatch: D }) {
  return (
    <div className="st-card st-choice-card">
      <Dial done={0} total={QUESTION_COUNT} />
      <div className="st-tab is-you">You</div>
      <p className="st-dialog-text">How do you open your pitch?</p>
      <ChoiceList
        choices={OPENERS.map((o) => ({
          key: o.id,
          label: `${o.label}: “${o.line}”`,
          onPick: () => {
            sfx('confirm');
            dispatch({ type: 'opener', id: o.id });
          },
        }))}
      />
    </div>
  );
}

const KIND_TAG: Record<AnswerKind, string> = { honest: 'Honest', bold: 'Bold', dodge: 'Dodge' };

export function QuestionPanel({ s, dispatch }: { s: GameState; dispatch: D }) {
  const q = currentQuestion(s);
  if (!q) return null;
  const kinds: AnswerKind[] = ['honest', 'bold', 'dodge'];
  return (
    <div className="st-card st-choice-card">
      <Dial done={s.qIndex} total={QUESTION_COUNT} />
      <div className="st-tab">
        {SHARKS[q.asker].name} · {TOPIC_LABEL[q.topic]}
      </div>
      <p className="st-dialog-text">{q.q}</p>
      <ChoiceList
        key={s.qIndex}
        choices={kinds.map((k) => ({
          key: k,
          label: q.answers[k],
          tag: KIND_TAG[k],
          onPick: () => {
            sfx('confirm');
            dispatch({ type: 'answer', kind: k });
          },
        }))}
      />
    </div>
  );
}

/* ---------- negotiation ---------- */

export function NegotiatePanel({ s, dispatch }: { s: GameState; dispatch: D }) {
  const [open, setOpen] = useState<SharkId | null>(null);
  const [counter, setCounter] = useState(0);
  const [confirmWalk, setConfirmWalk] = useState(false);
  const offer = s.offers.find((o) => o.shark === open);
  const lo = Math.max(1, Math.floor(s.ask.equity / 2));

  const startCounter = (id: SharkId) => {
    const o = s.offers.find((x) => x.shark === id)!;
    sfx('select');
    setOpen(id);
    setCounter(Math.max(lo, o.equity - 3));
  };

  return (
    <div className="st-card st-negotiate">
      <Dial done={QUESTION_COUNT} total={QUESTION_COUNT} />
      <div className="st-tab is-you">Your move</div>
      <p className="st-muted st-ask-ref">
        You asked {money(s.ask.amount)} for {s.ask.equity}%
      </p>
      <ul className="st-offers">
        {s.offers.map((o) => {
          const sh = SHARKS[o.shark];
          const extra = o.royalty ? ' + $1/unit royalty' : o.loan ? ` (${money(o.loan)} as a loan)` : '';
          return (
            <li key={o.shark} className={`st-offer ${open === o.shark ? 'is-open' : ''}`}>
              <div className="st-offer-row">
                <Sprite img={portrait(o.shark, 'happy')} scale={1.25} className="st-face" />
                <div className="st-offer-terms">
                  <b>{sh.name}</b>
                  <span>
                    {money(o.amount)} for {o.equity}%{extra}
                  </span>
                  <span className="st-patience" aria-label={`Patience ${o.patience}`}>
                    Patience {'●'.repeat(o.patience)}
                    {'○'.repeat(Math.max(0, sh.patience - o.patience))}
                  </span>
                </div>
                <div className="st-offer-actions">
                  <button
                    type="button"
                    className="st-btn is-teal"
                    onClick={() => {
                      sfx('confirm');
                      dispatch({ type: 'accept', shark: o.shark });
                    }}
                  >
                    Accept
                  </button>
                  <button type="button" className="st-btn" onClick={() => startCounter(o.shark)}>
                    Counter
                  </button>
                </div>
              </div>
              {open === o.shark && offer && (
                <div className="st-counter">
                  <label className="st-slider" htmlFor="st-counter">
                    <span>Counter at</span>
                    <b>{counter}%</b>
                    <input
                      id="st-counter"
                      type="range"
                      min={lo}
                      max={Math.max(lo, offer.equity - 1)}
                      value={counter}
                      onChange={(e) => setCounter(Number(e.target.value))}
                    />
                  </label>
                  <button
                    type="button"
                    className="st-btn is-teal"
                    onClick={() => {
                      sfx('confirm');
                      setOpen(null);
                      dispatch({ type: 'counter', shark: o.shark, equity: counter });
                    }}
                  >
                    Propose {counter}%
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="st-card-foot">
        {confirmWalk ? (
          <>
            <span className="st-muted">Leave every offer behind?</span>
            <button type="button" className="st-btn" onClick={() => setConfirmWalk(false)}>
              Stay
            </button>
            <button type="button" className="st-btn is-red" onClick={() => dispatch({ type: 'walk' })}>
              Walk away
            </button>
          </>
        ) : (
          <button type="button" className="st-link" onClick={() => setConfirmWalk(true)}>
            Walk away without a deal
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- epilogue ---------- */

export function ResultsPanel({ s, best, dispatch }: { s: GameState; best: string | null; dispatch: D }) {
  const r = s.result;
  const again = () => {
    sfx('confirm');
    dispatch({ type: 'start' });
  };
  useKeys((e) => {
    if (isConfirm(e)) {
      e.preventDefault();
      again();
    }
  });
  if (!r) return null;
  const p = PRODUCTS[s.product];
  return (
    <div className="st-card st-results">
      <div className="st-tab">Six months later · {p.name}</div>
      <div className="st-results-top">
        <div className={`st-grade is-${r.grade}`} aria-label={`Grade ${r.grade}`}>
          {r.grade}
        </div>
        <div>
          <h2>{r.title}</h2>
          <p className="st-muted">
            {r.deal
              ? `${SHARKS[r.deal.shark].name}: ${money(r.deal.amount)} for ${r.deal.equity}%${r.deal.royalty ? ' + royalty' : ''}${r.deal.loan ? ' (half loan)' : ''}`
              : 'No deal. You kept 100%.'}
          </p>
        </div>
      </div>
      <dl className="st-stats">
        <div>
          <dt>6-mo revenue</dt>
          <dd>{money(r.revenue6)}</dd>
        </div>
        <div>
          <dt>Company value</dt>
          <dd>{money(r.companyValue)}</dd>
        </div>
        <div>
          <dt>Your stake</dt>
          <dd>{money(r.stake)}</dd>
        </div>
        <div>
          <dt>Answers landed</dt>
          <dd>
            {r.good}/{QUESTION_COUNT}
          </dd>
        </div>
        <div>
          <dt>Sharks out</dt>
          <dd>{r.outs}/5</dd>
        </div>
      </dl>
      <div className="st-card-foot">
        {best && <span className="st-muted">Best: {best}</span>}
        <button type="button" className="st-link" onClick={() => dispatch({ type: 'toTitle' })}>
          Title screen
        </button>
        <APrompt label="Play again" onClick={again} />
      </div>
    </div>
  );
}
