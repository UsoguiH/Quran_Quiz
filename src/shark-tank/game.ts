import {
  EXTRA_TOPICS,
  OPENERS,
  PRODUCTS,
  SHARKS,
  SHARK_ORDER,
  TOPIC_ASKERS,
  fairValue,
  money,
  questionText,
  type AnswerKind,
  type OpenerId,
  type ProductId,
  type SharkId,
  type Strength,
  type Topic,
} from './data';
import type { SfxName } from './sfx';

export type Phase =
  | 'title'
  | 'workshop'
  | 'ask'
  | 'hallway'
  | 'doors'
  | 'intro'
  | 'opener'
  | 'qa'
  | 'offers'
  | 'negotiate'
  | 'deal'
  | 'epilogue';

export type Speaker = SharkId | 'you' | 'producer' | 'narrator';
export type BubbleKind = 'happy' | 'love' | 'meh' | 'angry' | 'ask' | 'dots' | 'out' | 'offer';

export interface Bubble {
  kind: BubbleKind;
  text?: string;
  sub?: string;
}

export interface Line {
  id: number;
  who: Speaker;
  text: string;
  bubbles?: Partial<Record<SharkId, Bubble>>;
  sfx?: SfxName;
}

export interface Offer {
  shark: SharkId;
  amount: number;
  equity: number;
  royalty?: number;
  loan?: number;
  minEquity: number;
  patience: number;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Result {
  deal: Offer | null;
  revenue6: number;
  companyValue: number;
  stake: number;
  ratio: number;
  grade: Grade;
  title: string;
  good: number;
  outs: number;
  headline: string;
}

export interface GameState {
  phase: Phase;
  queue: Line[];
  after: Phase | null;
  seq: number;
  seed: number;
  product: ProductId;
  browse: ProductId;
  ask: { amount: number; equity: number };
  sharks: Record<SharkId, { interest: number; out: boolean }>;
  confidence: number;
  opener: OpenerId | null;
  topics: Topic[];
  qIndex: number;
  asker: SharkId | null;
  good: number;
  offers: Offer[];
  deal: Offer | null;
  result: Result | null;
}

export type Action =
  | { type: 'start' }
  | { type: 'toTitle' }
  | { type: 'browse'; id: ProductId }
  | { type: 'pickProduct' }
  | { type: 'back' }
  | { type: 'setAsk'; amount?: number; equity?: number }
  | { type: 'confirmAsk' }
  | { type: 'advance' }
  | { type: 'openDoors' }
  | { type: 'enterTank' }
  | { type: 'opener'; id: OpenerId }
  | { type: 'answer'; kind: AnswerKind }
  | { type: 'accept'; shark: SharkId }
  | { type: 'counter'; shark: SharkId; equity: number }
  | { type: 'walk' };

export const QUESTION_COUNT = 5;

const DEFAULT_ASK: Record<ProductId, { amount: number; equity: number }> = {
  glow: { amount: 150000, equity: 15 },
  pup: { amount: 200000, equity: 12 },
  kelp: { amount: 100000, equity: 15 },
};

const freshSharks = () =>
  Object.fromEntries(SHARK_ORDER.map((id) => [id, { interest: 45, out: false }])) as GameState['sharks'];

export function initialState(seed = Date.now() | 0): GameState {
  return {
    phase: 'title',
    queue: [],
    after: null,
    seq: 0,
    seed,
    product: 'glow',
    browse: 'glow',
    ask: { ...DEFAULT_ASK.glow },
    sharks: freshSharks(),
    confidence: 3,
    opener: null,
    topics: [],
    qIndex: 0,
    asker: null,
    good: 0,
    offers: [],
    deal: null,
    result: null,
  };
}

/* ---------- helpers that mutate a draft ---------- */

function rand(s: GameState): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const pick = <T,>(s: GameState, list: T[]): T => list[Math.floor(rand(s) * list.length)];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function say(s: GameState, who: Speaker, text: string, extra: Partial<Omit<Line, 'id' | 'who' | 'text'>> = {}) {
  s.queue.push({ id: ++s.seq, who, text, ...extra });
}

export const askValuation = (ask: { amount: number; equity: number }) => ask.amount / (ask.equity / 100);

export function greedOf(s: Pick<GameState, 'product' | 'ask'>): number {
  return askValuation(s.ask) / fairValue(PRODUCTS[s.product]);
}

const inSharks = (s: GameState) => SHARK_ORDER.filter((id) => !s.sharks[id].out);

function reactionBubble(delta: number): Bubble {
  if (delta >= 10) return { kind: 'love' };
  if (delta >= 3) return { kind: 'happy' };
  if (delta >= -3) return { kind: 'meh' };
  return { kind: 'angry' };
}

function strengthFor(s: GameState, topic: Topic): Strength {
  if (topic === 'valuation') {
    const g = greedOf(s);
    return g <= 1.15 ? 'strong' : g <= 1.6 ? 'ok' : 'weak';
  }
  return PRODUCTS[s.product].strengths[topic] ?? 'ok';
}

const BASE: Record<AnswerKind, Record<Strength, number>> = {
  honest: { strong: 10, ok: 5, weak: -3 },
  bold: { strong: 12, ok: 4, weak: -10 },
  dodge: { strong: -8, ok: -8, weak: -8 },
};

function checkOuts(s: GameState, threshold: number) {
  inSharks(s).forEach((id) => {
    if (s.sharks[id].interest < threshold) {
      s.sharks[id].out = true;
      say(s, id, pick(s, SHARKS[id].outLines), { bubbles: { [id]: { kind: 'out' } }, sfx: 'out' });
    }
  });
}

function goTo(s: GameState, phase: Phase) {
  s.phase = phase;
  s.after = null;
  enterPhase(s, phase);
}

function enterPhase(s: GameState, phase: Phase) {
  const p = PRODUCTS[s.product];
  switch (phase) {
    case 'qa': {
      const topic = s.topics[s.qIndex];
      const live = inSharks(s);
      s.asker = TOPIC_ASKERS[topic].find((id) => live.includes(id)) ?? live[0] ?? null;
      break;
    }
    case 'offers': {
      s.asker = null;
      say(s, 'narrator', 'The questions stop. The Sharks lean back. Time for offers.');
      const fair = fairValue(p);
      const askVal = askValuation(s.ask);
      inSharks(s).forEach((id) => {
        const st = s.sharks[id];
        const shark = SHARKS[id];
        if (st.interest < 50) {
          st.out = true;
          say(s, id, pick(s, shark.outLines), { bubbles: { [id]: { kind: 'out' } }, sfx: 'out' });
          return;
        }
        const sharkVal = Math.min(fair * (0.55 + st.interest / 150), askVal);
        let amount = s.ask.amount;
        let equity = (amount / sharkVal) * 100;
        let floor = s.ask.equity;
        const offer: Offer = { shark: id, amount, equity: 0, minEquity: 0, patience: shark.patience };
        if (shark.style === 'royalty') {
          equity -= 4;
          offer.royalty = 1;
        } else if (shark.style === 'cash') {
          amount = Math.round((amount * 1.25) / 5000) * 5000;
          offer.amount = amount;
          equity = (amount / sharkVal) * 100;
          floor = s.ask.equity * (amount / s.ask.amount);
        } else if (shark.style === 'loan') {
          offer.loan = amount / 2;
          equity = (amount / 2 / sharkVal) * 100 + 2;
          floor = s.ask.equity / 2;
        }
        const eq = clamp(Math.round(equity), Math.ceil(floor), 60);
        const flex = 0.1 + (st.interest - 50) / 200;
        offer.equity = eq;
        offer.minEquity = clamp(Math.round(eq * (1 - flex)), Math.ceil(floor), eq);
        s.offers.push(offer);
        say(s, id, offerLine(offer), {
          bubbles: { [id]: { kind: 'offer', text: money(offer.amount), sub: `${eq}%` } },
          sfx: 'offer',
        });
      });
      if (s.offers.length === 0) {
        say(s, 'narrator', 'Not a single offer. The room goes quiet.');
        s.after = 'deal';
      } else {
        say(
          s,
          'narrator',
          s.offers.length === 1
            ? 'One offer on the table. Your move.'
            : `${s.offers.length} offers on the table. The Sharks are watching you. Your move.`,
        );
        s.after = 'negotiate';
      }
      break;
    }
    case 'deal': {
      s.asker = null;
      if (s.deal) {
        const shark = SHARKS[s.deal.shark];
        say(s, s.deal.shark, "Come here! Let's go make some money together.", {
          bubbles: { [s.deal.shark]: { kind: 'love' } },
          sfx: 'deal',
        });
        say(s, 'narrator', `You shake hands with ${shark.name}. The other Sharks clap.`);
        say(s, 'you', 'I did it. I actually did it.');
      } else {
        say(s, 'you', 'Thank you, Sharks. I still believe in this.', { sfx: 'out' });
        say(s, 'narrator', 'You walk out of the Tank without a deal. The doors close behind you.');
      }
      s.after = 'epilogue';
      break;
    }
    case 'epilogue': {
      s.result = computeResult(s);
      say(s, 'narrator', 'Six months later...');
      say(s, 'narrator', s.result.headline, { sfx: ['S', 'A', 'B'].includes(s.result.grade) ? 'deal' : 'blip' });
      break;
    }
    default:
      break;
  }
}

function offerLine(o: Offer): string {
  const m = money(o.amount);
  if (o.royalty) return `${m} for ${o.equity}%, plus a $1 royalty on every unit until I've made my money back.`;
  if (o.loan) return `${m}. Half as a loan at 8%, and the other half for ${o.equity}% of the company.`;
  if (SHARKS[o.shark].style === 'cash') return `I'll give you more than you asked for. ${m} for ${o.equity}%.`;
  return `I'll give you ${m} for ${o.equity}%.`;
}

const BOOST: Record<SharkId, (cat: string) => number> = {
  rex: (c) => (c === 'home' || c === 'food' ? 2.4 : 1.6),
  coral: (c) => (c === 'home' || c === 'pets' ? 2.6 : 1.5),
  tiger: (c) => (c === 'pets' ? 2.3 : 1.4),
  nova: (c) => (c === 'food' ? 2.5 : 1.5),
  goldfin: () => 1.6,
};

const TITLES: Record<SharkId, string> = {
  rex: 'Retail Rocket',
  goldfin: 'Royalty Survivor',
  coral: 'Home Shopping Star',
  tiger: 'Tiger-Backed Cub',
  nova: 'Clean-Label Contender',
};

const HEADLINES: Record<SharkId, string> = {
  rex: 'Rex got you into 1,200 stores. Your garage is now a warehouse.',
  goldfin: 'Mr. Goldfin collects his royalty every month. He sends a card that just says "More."',
  coral: 'Coral put you on her home shopping show. You sold out in nine minutes.',
  tiger: "Tiger's team rebuilt your app. Downloads went through the roof.",
  nova: 'Nova got you a clean-label certification and a spot on 500 new shelves.',
};

function computeResult(s: GameState): Result {
  const p = PRODUCTS[s.product];
  const deal = s.deal;
  // what the company would be worth in six months with no show at all
  const gf = 1 + (p.growth / 100) * 3;
  const baseline = fairValue(p) * gf;
  // every answer that landed adds a little post-show buzz
  const buzz = 1 + s.good * 0.03;
  const boost = (deal ? BOOST[deal.shark](p.category) : 1.15) * buzz;
  const revenue6 = (p.sales / 2) * gf * boost;
  let companyValue = baseline * boost;
  if (deal) {
    companyValue += deal.amount - (deal.loan ?? 0);
    if (deal.royalty) companyValue -= Math.min(deal.amount, (revenue6 / p.price) * 2);
  }
  const stake = companyValue * (1 - (deal ? deal.equity : 0) / 100);
  const ratio = stake / baseline;
  const grade: Grade = ratio >= 2.6 ? 'S' : ratio >= 1.9 ? 'A' : ratio >= 1.3 ? 'B' : ratio >= 0.9 ? 'C' : 'D';
  const title = deal
    ? grade === 'D'
      ? 'Shark Snack'
      : TITLES[deal.shark]
    : grade === 'C'
      ? 'Walked Away Wiser'
      : 'Back to the Garage';
  const headline = deal
    ? HEADLINES[deal.shark]
    : 'Your episode aired anyway. The website crashed from orders for two days.';
  return {
    deal,
    revenue6,
    companyValue,
    stake,
    ratio,
    grade,
    title,
    good: s.good,
    outs: SHARK_ORDER.filter((id) => s.sharks[id].out).length,
    headline,
  };
}

/* ---------- reducer ---------- */

export function reducer(state: GameState, action: Action): GameState {
  const s: GameState = structuredClone(state);
  const p = PRODUCTS[s.product];

  switch (action.type) {
    case 'toTitle':
      return initialState(s.seed);

    case 'start': {
      if (s.phase !== 'title' && s.phase !== 'epilogue') return state;
      const n = initialState(s.seed);
      n.phase = 'workshop';
      say(n, 'narrator', 'Your garage. 2:14 AM. Tomorrow you walk into the Tank.');
      say(n, 'narrator', "Three prototypes, one pitch. Pick the product you'll bet everything on.");
      return n;
    }

    case 'browse':
      s.browse = action.id;
      return s;

    case 'pickProduct':
      if (s.phase !== 'workshop' || s.queue.length) return state;
      s.product = s.browse;
      s.ask = { ...DEFAULT_ASK[s.product] };
      s.phase = 'ask';
      say(s, 'narrator', `${PRODUCTS[s.product].name} it is. Now the hard part: how much do you ask for, and for what slice?`);
      return s;

    case 'back':
      if (s.phase === 'ask') s.phase = 'workshop';
      return s;

    case 'setAsk':
      if (action.amount !== undefined) s.ask.amount = clamp(action.amount, 50000, 500000);
      if (action.equity !== undefined) s.ask.equity = clamp(action.equity, 5, 40);
      return s;

    case 'confirmAsk': {
      if (s.phase !== 'ask') return state;
      const greed = greedOf(s);
      const penalty = clamp((greed - 1) * 30, -10, 40);
      SHARK_ORDER.forEach((id) => {
        const sh = SHARKS[id];
        let i = 42 - penalty + (rand(s) * 6 - 3);
        if (sh.loves.includes(p.category)) i += 14;
        if (sh.dislikes.includes(p.category)) i -= 12;
        s.sharks[id] = { interest: clamp(Math.round(i), 5, 95), out: false };
      });
      s.phase = 'hallway';
      say(s, 'producer', "Hey! I'm Pia, I produce your segment. You're up in two minutes.");
      say(s, 'producer', p.tips[0]);
      say(s, 'producer', p.tips[1]);
      if (greed > 1.6) say(s, 'producer', 'And that valuation is spicy. Be ready to defend it.');
      else if (greed < 0.95) say(s, 'producer', 'Your ask is modest. The Sharks will like that.');
      say(s, 'producer', 'Walk to the doors when you’re ready. Breathe.');
      return s;
    }

    case 'openDoors':
      if (s.phase !== 'hallway' || s.queue.length) return state;
      s.phase = 'doors';
      return s;

    case 'enterTank':
      if (s.phase !== 'doors') return state;
      s.phase = 'intro';
      say(s, 'narrator', 'The doors swing open. Five Sharks watch you walk to your mark.', {
        bubbles: Object.fromEntries(SHARK_ORDER.map((id) => [id, { kind: 'dots' }])),
      });
      say(
        s,
        'you',
        `Hi Sharks! I'm the founder of ${p.name}, and I'm seeking ${money(s.ask.amount)} for ${s.ask.equity}% of my company.`,
      );
      say(s, 'you', p.tagline);
      s.after = 'opener';
      return s;

    case 'advance': {
      if (!s.queue.length) return state;
      s.queue.shift();
      if (!s.queue.length && s.after) goTo(s, s.after);
      return s;
    }

    case 'opener': {
      if (s.phase !== 'opener' || s.queue.length) return state;
      const op = OPENERS.find((o) => o.id === action.id)!;
      s.opener = op.id;
      say(s, 'you', op.line);
      const bubbles: Partial<Record<SharkId, Bubble>> = {};
      SHARK_ORDER.forEach((id) => {
        const d = Math.round((op.effects[id] ?? 0) * (0.8 + rand(s) * 0.4));
        s.sharks[id].interest = clamp(s.sharks[id].interest + d, 0, 100);
        bubbles[id] = reactionBubble(d);
      });
      const best = SHARK_ORDER.reduce((a, b) => ((op.effects[a] ?? 0) >= (op.effects[b] ?? 0) ? a : b));
      say(s, best, pick(s, SHARKS[best].goodLines), { bubbles, sfx: 'blip' });
      const extras = [...EXTRA_TOPICS].sort(() => rand(s) - 0.5);
      s.topics = ['sales', 'margin', extras[0], 'valuation', extras[1]];
      s.qIndex = 0;
      s.after = 'qa';
      return s;
    }

    case 'answer': {
      if (s.phase !== 'qa' || s.queue.length || !s.asker) return state;
      const topic = s.topics[s.qIndex];
      const strength = strengthFor(s, topic);
      const base = BASE[action.kind][strength];
      const confMult = 0.7 + s.confidence * 0.1;
      const asker = s.asker;
      const bubbles: Partial<Record<SharkId, Bubble>> = {};
      let askerDelta = 0;
      inSharks(s).forEach((id) => {
        const sh = SHARKS[id];
        const w = sh.weights[action.kind];
        let d = base;
        if (base > 0) d = base * w * confMult + (sh.loves.includes(p.category) ? 2 : 0);
        else if (action.kind === 'bold') d = base * (2.2 - w);
        else if (action.kind === 'dodge') d = base * w;
        if (id === asker) d *= 1.6;
        d = Math.round(d + (rand(s) * 4 - 2));
        s.sharks[id].interest = clamp(s.sharks[id].interest + d, 0, 100);
        if (id === asker) askerDelta = d;
        else if (Math.abs(d) >= 8) bubbles[id] = reactionBubble(d);
      });
      bubbles[asker] = reactionBubble(askerDelta);
      const good = askerDelta > 2;
      if (good) s.good += 1;
      s.confidence = clamp(s.confidence + (good ? 1 : -1), 0, 5);
      const q = questionText(topic, p, s.ask);
      say(s, 'you', q.answers[action.kind]);
      say(s, asker, pick(s, good ? SHARKS[asker].goodLines : SHARKS[asker].badLines), {
        bubbles,
        sfx: good ? 'good' : 'bad',
      });
      checkOuts(s, 22);
      s.qIndex += 1;
      if (inSharks(s).length === 0) {
        say(s, 'narrator', 'All five Sharks are out.');
        s.deal = null;
        s.after = 'deal';
      } else if (s.qIndex < QUESTION_COUNT) {
        s.after = 'qa';
      } else {
        s.after = 'offers';
      }
      return s;
    }

    case 'accept': {
      if (s.phase !== 'negotiate' || s.queue.length) return state;
      const o = s.offers.find((x) => x.shark === action.shark);
      if (!o) return state;
      s.deal = o;
      say(s, 'you', `${SHARKS[o.shark].short}, you've got a deal!`);
      s.after = 'deal';
      return s;
    }

    case 'counter': {
      if (s.phase !== 'negotiate' || s.queue.length) return state;
      const o = s.offers.find((x) => x.shark === action.shark);
      if (!o) return state;
      const sh = SHARKS[o.shark];
      const eq = Math.round(action.equity);
      say(s, 'you', `${sh.short}, would you do ${money(o.amount)} for ${eq}%?`);
      if (eq >= o.minEquity) {
        s.deal = { ...o, equity: eq };
        say(s, o.shark, 'You drive a hard bargain. Fine. Deal!', {
          bubbles: { [o.shark]: { kind: 'love' } },
          sfx: 'good',
        });
        s.after = 'deal';
        return s;
      }
      if (o.patience > 0) {
        o.patience -= 1;
        o.equity = Math.max(o.minEquity, Math.round((o.equity + eq) / 2));
        say(
          s,
          o.shark,
          o.patience === 0
            ? `${money(o.amount)} for ${o.equity}%. That's my final offer.`
            : `I'll meet you partway. ${money(o.amount)} for ${o.equity}%.`,
          { bubbles: { [o.shark]: { kind: 'offer', text: money(o.amount), sub: `${o.equity}%` } }, sfx: 'offer' },
        );
      } else {
        s.offers = s.offers.filter((x) => x !== o);
        s.sharks[o.shark].out = true;
        say(s, o.shark, "No. I told you that was final. I'm out.", {
          bubbles: { [o.shark]: { kind: 'out' } },
          sfx: 'out',
        });
      }
      s.offers.forEach((other) => {
        if (other.shark === o.shark) return;
        const st = s.sharks[other.shark];
        st.interest -= 4;
        if (st.interest < 50) {
          st.out = true;
          say(s, other.shark, "Too much haggling. My offer's off the table.", {
            bubbles: { [other.shark]: { kind: 'out' } },
            sfx: 'out',
          });
        }
      });
      s.offers = s.offers.filter((x) => !s.sharks[x.shark].out);
      if (s.offers.length === 0) {
        say(s, 'narrator', 'Every offer is gone.');
        s.deal = null;
        s.after = 'deal';
      }
      return s;
    }

    case 'walk': {
      if (s.phase !== 'negotiate' || s.queue.length) return state;
      s.deal = null;
      say(s, 'you', "Thank you, Sharks, but I'm going to walk away.", {
        bubbles: Object.fromEntries(s.offers.map((o) => [o.shark, { kind: 'meh' }])),
      });
      s.after = 'deal';
      return s;
    }
  }
  return state;
}

export function currentQuestion(s: GameState) {
  if (s.phase !== 'qa' || !s.asker) return null;
  const topic = s.topics[s.qIndex];
  return { topic, asker: s.asker, ...questionText(topic, PRODUCTS[s.product], s.ask) };
}
