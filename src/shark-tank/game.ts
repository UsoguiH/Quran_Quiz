import {
  PRODUCTS,
  SHARKS,
  SHARK_ORDER,
  fairValue,
  type ProductId,
  type QType,
  type SharkId,
  type Strength,
} from './data';

export type Phase =
  | 'title'
  | 'cut-intro'
  | 'workshop'
  | 'ask'
  | 'cut-walkin'
  | 'pitch'
  | 'demo'
  | 'grill'
  | 'offers'
  | 'haggle'
  | 'cut-deal'
  | 'cut-nodeal'
  | 'cut-later'
  | 'epilogue';

export type BubbleKind = 'happy' | 'love' | 'meh' | 'angry' | 'ask' | 'dots' | 'out' | 'offer';

export interface Bubble {
  kind: BubbleKind;
  text?: string;
  sub?: string;
}

export type PitchGrade = 'perfect' | 'good' | 'miss';
export type GrillOutcome = 'nailed' | 'wrong' | 'hit';

export interface Offer {
  shark: SharkId;
  amount: number;
  equity: number;
  royalty?: number;
  loan?: number;
  /** Lowest equity this Shark will shake on. Hidden from the player. */
  minEquity: number;
  /** The haggle bar can't go below what you originally asked for. */
  floor: number;
  patience: number;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Stats {
  pitch: PitchGrade[];
  catches: number;
  throws: number;
  nailed: number;
  asked: number;
}

export interface Result {
  deal: Offer | null;
  revenue6: number;
  companyValue: number;
  stake: number;
  ratio: number;
  grade: Grade;
  title: string;
  outs: number;
}

export interface GameState {
  phase: Phase;
  seed: number;
  product: ProductId;
  browse: ProductId;
  ask: { amount: number; equity: number };
  sharks: Record<SharkId, { interest: number; out: boolean }>;
  nerve: number;
  stats: Stats;
  caught: SharkId[];
  offers: Offer[];
  /** Order in which the Sharks announce offers or drop out. */
  reveal: { shark: SharkId; offer: boolean }[];
  deal: Offer | null;
  result: Result | null;
}

export type Action =
  | { type: 'start' }
  | { type: 'toTitle' }
  | { type: 'cutDone' }
  | { type: 'browse'; id: ProductId }
  | { type: 'pickProduct' }
  | { type: 'back' }
  | { type: 'setAsk'; amount?: number; equity?: number }
  | { type: 'confirmAsk' }
  | { type: 'pitch'; grade: PitchGrade }
  | { type: 'demo'; shark: SharkId | null }
  | { type: 'grill'; shark: SharkId; outcome: GrillOutcome; strength: Strength }
  | { type: 'next' }
  | { type: 'sharkWalks'; shark: SharkId }
  | { type: 'shake'; shark: SharkId; equity: number }
  | { type: 'walk' };

export const PITCH_BEATS = 3;
export const SAMPLES = 5;
export const QUESTIONS = 9;

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
    seed,
    product: 'glow',
    browse: 'glow',
    ask: { ...DEFAULT_ASK.glow },
    sharks: freshSharks(),
    nerve: 3,
    stats: { pitch: [], catches: 0, throws: 0, nailed: 0, asked: 0 },
    caught: [],
    offers: [],
    reveal: [],
    deal: null,
    result: null,
  };
}

function rand(s: GameState): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const askValuation = (ask: { amount: number; equity: number }) => ask.amount / (ask.equity / 100);

export function greedOf(s: Pick<GameState, 'product' | 'ask'>): number {
  return askValuation(s.ask) / fairValue(PRODUCTS[s.product]);
}

export const inSharks = (s: Pick<GameState, 'sharks'>) => SHARK_ORDER.filter((id) => !s.sharks[id].out);

/** How hard a question type hits this product. Greedy asks make the numbers tougher. */
export function strengthFor(s: Pick<GameState, 'product' | 'ask'>, q: QType): Strength {
  const base = PRODUCTS[s.product].grill[q];
  if (q === 'numbers' && greedOf(s) > 1.6) return base === 'strong' ? 'ok' : 'weak';
  return base;
}

const bump = (s: GameState, id: SharkId, d: number) => {
  s.sharks[id].interest = clamp(Math.round(s.sharks[id].interest + d), 0, 100);
};

const nerveMult = (s: GameState) => 0.7 + s.nerve * 0.1;

function checkOuts(s: GameState, threshold: number) {
  inSharks(s).forEach((id) => {
    if (s.sharks[id].interest < threshold) s.sharks[id].out = true;
  });
}

function buildOffers(s: GameState) {
  const p = PRODUCTS[s.product];
  const fair = fairValue(p);
  const askVal = askValuation(s.ask);
  s.offers = [];
  s.reveal = [];
  inSharks(s).forEach((id) => {
    const st = s.sharks[id];
    const shark = SHARKS[id];
    if (st.interest < 50) {
      st.out = true;
      s.reveal.push({ shark: id, offer: false });
      return;
    }
    const sharkVal = Math.min(fair * (0.55 + st.interest / 150), askVal);
    let amount = s.ask.amount;
    let equity = (amount / sharkVal) * 100;
    let floor = s.ask.equity;
    const offer: Offer = { shark: id, amount, equity: 0, minEquity: 0, floor: 0, patience: shark.patience };
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
    offer.floor = Math.min(eq, Math.ceil(floor));
    offer.minEquity = clamp(Math.round(eq * (1 - flex)), offer.floor, eq);
    s.offers.push(offer);
    s.reveal.push({ shark: id, offer: true });
  });
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

/** Points for playing the rounds well; they become post-show buzz. */
export function performance(st: Stats): number {
  const pitch = st.pitch.reduce((n, g) => n + (g === 'perfect' ? 2 : g === 'good' ? 1 : 0), 0);
  return pitch + st.catches + st.nailed;
}

function computeResult(s: GameState): Result {
  const p = PRODUCTS[s.product];
  const deal = s.deal;
  const gf = 1 + (p.growth / 100) * 3;
  const baseline = fairValue(p) * gf;
  const buzz = 1 + performance(s.stats) * 0.012;
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
  return {
    deal,
    revenue6,
    companyValue,
    stake,
    ratio,
    grade,
    title,
    outs: SHARK_ORDER.filter((id) => s.sharks[id].out).length,
  };
}

const NEXT_ROUND: Partial<Record<Phase, Phase>> = { pitch: 'demo', demo: 'grill', grill: 'offers', offers: 'haggle' };

export function reducer(state: GameState, action: Action): GameState {
  const s: GameState = structuredClone(state);
  const p = PRODUCTS[s.product];

  switch (action.type) {
    case 'toTitle':
      return initialState(s.seed);

    case 'start': {
      if (s.phase !== 'title' && s.phase !== 'epilogue') return state;
      const n = initialState(s.seed);
      n.phase = 'cut-intro';
      return n;
    }

    case 'cutDone': {
      const next: Partial<Record<Phase, Phase>> = {
        'cut-intro': 'workshop',
        'cut-walkin': 'pitch',
        'cut-deal': 'cut-later',
        'cut-nodeal': 'cut-later',
        'cut-later': 'epilogue',
      };
      const to = next[s.phase];
      if (!to) return state;
      s.phase = to;
      if (to === 'cut-later') s.result = computeResult(s);
      return s;
    }

    case 'browse':
      s.browse = action.id;
      return s;

    case 'pickProduct':
      if (s.phase !== 'workshop') return state;
      s.product = s.browse;
      s.ask = { ...DEFAULT_ASK[s.product] };
      s.phase = 'ask';
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
      s.phase = 'cut-walkin';
      return s;
    }

    case 'pitch': {
      if (s.phase !== 'pitch' || s.stats.pitch.length >= PITCH_BEATS) return state;
      s.stats.pitch.push(action.grade);
      const d = action.grade === 'perfect' ? 7 : action.grade === 'good' ? 3 : -4;
      SHARK_ORDER.forEach((id) => bump(s, id, d * (d > 0 ? nerveMult(s) : 1) + (rand(s) * 2 - 1)));
      if (action.grade === 'perfect') s.nerve = clamp(s.nerve + 1, 0, 5);
      if (action.grade === 'miss') s.nerve = clamp(s.nerve - 1, 0, 5);
      return s;
    }

    case 'demo': {
      if (s.phase !== 'demo' || s.stats.throws >= SAMPLES) return state;
      s.stats.throws += 1;
      const id = action.shark;
      if (!id || s.sharks[id].out) {
        inSharks(s).forEach((o) => bump(s, o, -1));
        return s;
      }
      s.stats.catches += 1;
      const first = !s.caught.includes(id);
      if (first) s.caught.push(id);
      const loves = SHARKS[id].loves.includes(p.category);
      bump(s, id, first ? (loves ? 10 : 6) * nerveMult(s) : 2);
      return s;
    }

    case 'grill': {
      if (s.phase !== 'grill') return state;
      const { shark, outcome, strength } = action;
      if (outcome === 'nailed') {
        s.stats.nailed += 1;
        s.stats.asked += 1;
        const gain = strength === 'strong' ? 9 : strength === 'weak' ? 10 : 7;
        bump(s, shark, gain * nerveMult(s));
        inSharks(s).forEach((o) => o !== shark && bump(s, o, 1));
        s.nerve = clamp(s.nerve + 1, 0, 5);
      } else if (outcome === 'wrong') {
        bump(s, shark, -5);
        s.nerve = clamp(s.nerve - 1, 0, 5);
      } else {
        s.stats.asked += 1;
        bump(s, shark, -9);
        inSharks(s).forEach((o) => o !== shark && bump(s, o, -2));
        s.nerve = clamp(s.nerve - 1, 0, 5);
      }
      checkOuts(s, 22);
      return s;
    }

    case 'next': {
      const to = NEXT_ROUND[s.phase];
      if (!to) return state;
      if (to === 'offers') buildOffers(s);
      if (to === 'haggle' && s.offers.length === 0) {
        s.deal = null;
        s.phase = 'cut-nodeal';
        return s;
      }
      s.phase = to;
      return s;
    }

    case 'sharkWalks': {
      if (s.phase !== 'haggle') return state;
      s.sharks[action.shark].out = true;
      s.offers = s.offers.filter((o) => o.shark !== action.shark);
      // the rest of the panel cools on you
      s.offers.forEach((o) => {
        bump(s, o.shark, -4);
        if (s.sharks[o.shark].interest < 50) s.sharks[o.shark].out = true;
      });
      s.offers = s.offers.filter((o) => !s.sharks[o.shark].out);
      if (s.offers.length === 0) {
        s.deal = null;
        s.phase = 'cut-nodeal';
      }
      return s;
    }

    case 'shake': {
      if (s.phase !== 'haggle') return state;
      const o = s.offers.find((x) => x.shark === action.shark);
      if (!o || action.equity < o.minEquity) return state;
      s.deal = { ...o, equity: action.equity };
      s.phase = 'cut-deal';
      return s;
    }

    case 'walk':
      if (s.phase !== 'haggle') return state;
      s.deal = null;
      s.phase = 'cut-nodeal';
      return s;
  }
  return state;
}
