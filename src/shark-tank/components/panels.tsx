import { type Dispatch } from 'react';
import { PRODUCTS, PRODUCT_ORDER, SHARKS, fairValue, money } from '../data';
import { PITCH_BEATS, QUESTIONS, SAMPLES, askValuation, greedOf, type Action, type GameState } from '../game';
import { coinSprite, productSprite } from '../pixel/sprites';
import { sfx } from '../sfx';
import { APrompt, Sprite } from './ui';
import { isConfirm, useKeys } from './stage';

type D = Dispatch<Action>;

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
    else if (isConfirm(e) && !e.repeat) {
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
    if (e.key === 'Enter' && !e.repeat) {
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

/* ---------- epilogue ---------- */

export function ResultsPanel({ s, best, dispatch }: { s: GameState; best: string | null; dispatch: D }) {
  const r = s.result;
  const again = () => {
    sfx('confirm');
    dispatch({ type: 'start' });
  };
  useKeys((e) => {
    if (isConfirm(e) && !e.repeat) {
      e.preventDefault();
      again();
    }
  });
  if (!r) return null;
  const p = PRODUCTS[s.product];
  const perfects = s.stats.pitch.filter((g) => g === 'perfect').length;
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
          <dt>Your stake</dt>
          <dd>{money(r.stake)}</dd>
        </div>
        <div>
          <dt>Company value</dt>
          <dd>{money(r.companyValue)}</dd>
        </div>
        <div>
          <dt>Perfect beats</dt>
          <dd>
            {perfects}/{PITCH_BEATS}
          </dd>
        </div>
        <div>
          <dt>Samples caught</dt>
          <dd>
            {s.stats.catches}/{SAMPLES}
          </dd>
        </div>
        <div>
          <dt>Questions blocked</dt>
          <dd>
            {s.stats.nailed}/{QUESTIONS}
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
