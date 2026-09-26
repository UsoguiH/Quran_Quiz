export type SharkId = 'rex' | 'goldfin' | 'coral' | 'tiger' | 'nova';
export type Category = 'home' | 'pets' | 'food';
export type ProductId = 'glow' | 'pup' | 'kelp';
export type AnswerKind = 'honest' | 'bold' | 'dodge';
export type Strength = 'strong' | 'ok' | 'weak';
export type Topic =
  | 'sales'
  | 'margin'
  | 'valuation'
  | 'patent'
  | 'competition'
  | 'customers'
  | 'personal'
  | 'money';
export type OpenerId = 'story' | 'numbers' | 'demo' | 'hype';
export type DealStyle = 'equity' | 'royalty' | 'cash' | 'loan';

export interface Shark {
  id: SharkId;
  name: string;
  short: string;
  title: string;
  loves: Category[];
  dislikes: Category[];
  weights: Record<AnswerKind, number>;
  style: DealStyle;
  patience: number;
  hair: 'short' | 'bald' | 'long' | 'spiky' | 'bun';
  glasses?: boolean;
  hoodie?: boolean;
  palette: Record<string, string>;
  outLines: string[];
  goodLines: string[];
  badLines: string[];
}

export const SHARK_ORDER: SharkId[] = ['rex', 'goldfin', 'coral', 'tiger', 'nova'];

export const SHARKS: Record<SharkId, Shark> = {
  rex: {
    id: 'rex',
    name: 'Rex Hammer',
    short: 'Rex',
    title: 'The Retail King',
    loves: ['home', 'food'],
    dislikes: [],
    weights: { honest: 1, bold: 1.2, dodge: 1 },
    style: 'equity',
    patience: 2,
    hair: 'short',
    palette: {
      h: '#5a3421', H: '#3d2317', s: '#f0c29a', S: '#d49a73',
      c: '#2c4a7a', C: '#1f3559', t: '#c8452f', p: '#243a5e',
    },
    outLines: [
      "I can't see this on a shelf. I'm out.",
      "Too many holes in the story. For that reason, I'm out.",
    ],
    goodLines: ['Now THAT I can sell in 4,000 stores.', 'I like hustle. Keep going.'],
    badLines: ["That's a retail buyer's nightmare.", 'Hmm. Not loving that.'],
  },
  goldfin: {
    id: 'goldfin',
    name: 'Mr. Goldfin',
    short: 'Goldfin',
    title: 'The Royalty Man',
    loves: [],
    dislikes: ['food'],
    weights: { honest: 1.3, bold: 0.6, dodge: 1.5 },
    style: 'royalty',
    patience: 1,
    hair: 'bald',
    glasses: true,
    palette: {
      h: '#c9c2b5', H: '#9a9285', s: '#f2cfae', S: '#d6ad89',
      c: '#26262e', C: '#15151a', t: '#1f9e87', p: '#1c1c22',
    },
    outLines: [
      "I don't invest in hope. I invest in math. I'm out.",
      "This will never pay me back. I'm out.",
    ],
    goodLines: ['Finally, a number I can respect.', 'Now you are speaking my language.'],
    badLines: ['Stop. That makes no sense.', "That's how money goes to die."],
  },
  coral: {
    id: 'coral',
    name: 'Coral Vance',
    short: 'Coral',
    title: 'Queen of Home Shopping',
    loves: ['home', 'pets'],
    dislikes: [],
    weights: { honest: 1.1, bold: 1, dodge: 1 },
    style: 'equity',
    patience: 2,
    hair: 'long',
    palette: {
      h: '#d9582e', H: '#a83d1c', s: '#f6d0ae', S: '#dcae8a',
      c: '#1f9e87', C: '#146e5f', t: '#f4e6c4', p: '#1b5e52',
    },
    outLines: [
      "I don't think I'm the right Shark for you. I'm out.",
      "My shoppers won't buy it twice. I'm out.",
    ],
    goodLines: ['Oh, my customers would LOVE that.', 'I can already see the TV segment.'],
    badLines: ["That worries me, honey.", "I'm not sure I believe that."],
  },
  tiger: {
    id: 'tiger',
    name: 'Tiger Mako',
    short: 'Tiger',
    title: 'The Tech Maverick',
    loves: ['pets'],
    dislikes: ['food'],
    weights: { honest: 0.8, bold: 1.4, dodge: 0.8 },
    style: 'cash',
    patience: 1,
    hair: 'spiky',
    hoodie: true,
    palette: {
      h: '#1c1c24', H: '#0f0f14', s: '#c98d62', S: '#a86f48',
      c: '#e8793a', C: '#b85a28', t: '#e8793a', p: '#3a3f4a',
    },
    outLines: ['No moat, no Tiger. I\'m out.', "I don't see the scale. I'm out."],
    goodLines: ['Okay, okay. Now I\'m leaning in.', 'That\'s the energy I back.'],
    badLines: ['Boring.', "You're losing me."],
  },
  nova: {
    id: 'nova',
    name: 'Nova Reyes',
    short: 'Nova',
    title: 'The Clean-Label Investor',
    loves: ['food'],
    dislikes: [],
    weights: { honest: 1.4, bold: 0.7, dodge: 1.3 },
    style: 'loan',
    patience: 3,
    hair: 'bun',
    palette: {
      h: '#2d1b14', H: '#1a0f0b', s: '#8d5a3b', S: '#6e432b',
      c: '#6d4a9e', C: '#4f3478', t: '#f2b134', p: '#3f2d5c',
    },
    outLines: [
      "I invest in founders I trust. Today that's not you. I'm out.",
      "It's not the business for me. I'm out.",
    ],
    goodLines: ['I appreciate the honesty.', 'That tells me you know your business.'],
    badLines: ["I don't like spin.", 'That answer makes me nervous.'],
  },
};

export interface Product {
  id: ProductId;
  name: string;
  tagline: string;
  category: Category;
  price: number;
  cost: number;
  sales: number;
  growth: number;
  patent: 'granted' | 'pending' | 'none';
  strengths: Partial<Record<Topic, Strength>>;
  facts: {
    customers: string;
    competition: string;
    story: string;
    money: string;
    patent: string;
  };
  tips: string[];
  unitsPerYear: number;
}

export const PRODUCTS: Record<ProductId, Product> = {
  glow: {
    id: 'glow',
    name: 'Glow Jar',
    tagline: 'A self-watering herb jar that glows when your plant is thirsty.',
    category: 'home',
    price: 39,
    cost: 9,
    sales: 186000,
    growth: 12,
    patent: 'pending',
    strengths: {
      sales: 'ok', margin: 'strong', patent: 'ok', competition: 'weak',
      customers: 'strong', personal: 'strong', money: 'strong',
    },
    facts: {
      customers: 'Apartment gardeners. 40% of buyers come back for a second jar.',
      competition: 'Honestly, one factory makes every jar. A big brand could copy us.',
      story: 'I killed every plant I owned. So I built one that tells me when it’s thirsty.',
      money: 'Inventory for our first order from a national home chain.',
      patent: 'Patent pending on the moisture-glow sensor.',
    },
    tips: [
      'Your margins are gorgeous. Lead with them.',
      "If they ask about copycats, don't bluff. You only have one factory.",
    ],
    unitsPerYear: 4770,
  },
  pup: {
    id: 'pup',
    name: 'Pup Pod',
    tagline: 'A treat-tossing pet camera you run from your phone.',
    category: 'pets',
    price: 129,
    cost: 71,
    sales: 420000,
    growth: 4,
    patent: 'granted',
    strengths: {
      sales: 'strong', margin: 'weak', patent: 'strong', competition: 'ok',
      customers: 'ok', personal: 'ok', money: 'ok',
    },
    facts: {
      customers: 'Dog owners who work long days. Returns run about 9%.',
      competition: 'Two bigger brands exist, but our toss mechanism is patented.',
      story: 'My dog Biscuit cried every time I left for work.',
      money: 'Cutting unit cost with a bigger production run.',
      patent: 'Utility patent granted on the treat launcher.',
    },
    tips: [
      'Your sales are the best in today’s lineup. Say the number proudly.',
      'Margins are your soft spot. Mr. Goldfin will smell a bluff.',
    ],
    unitsPerYear: 3256,
  },
  kelp: {
    id: 'kelp',
    name: 'Kelp Crunch',
    tagline: 'Sea-salt seaweed chips that kids actually ask for.',
    category: 'food',
    price: 4,
    cost: 1.6,
    sales: 92000,
    growth: 22,
    patent: 'none',
    strengths: {
      sales: 'weak', margin: 'ok', patent: 'weak', competition: 'ok',
      customers: 'strong', personal: 'strong', money: 'strong',
    },
    facts: {
      customers: 'Parents and kids. We’re in 60 grocery stores and reorders are 70%.',
      competition: 'Big snack brands have seaweed, but kids pick ours in taste tests.',
      story: 'My grandmother’s recipe, and my kids wouldn’t eat anything else.',
      money: 'Getting into 500 more stores this year.',
      patent: 'No patent. It’s a recipe, so our brand is the moat.',
    },
    tips: [
      'Sales are small, but you grow 22% a month. That’s your story.',
      "There's no patent. Don't pretend there is.",
    ],
    unitsPerYear: 23000,
  },
};

export const PRODUCT_ORDER: ProductId[] = ['glow', 'pup', 'kelp'];

const MULTIPLE: Record<Category, number> = { home: 3.5, pets: 3, food: 4 };

export function fairValue(p: Product): number {
  return p.sales * MULTIPLE[p.category] * (1 + p.growth / 40);
}

export interface Opener {
  id: OpenerId;
  label: string;
  line: string;
  effects: Partial<Record<SharkId, number>>;
}

export const OPENERS: Opener[] = [
  {
    id: 'story',
    label: 'The Story',
    line: 'Let me tell you why I started this.',
    effects: { coral: 8, nova: 8, rex: 2, tiger: 2, goldfin: -4 },
  },
  {
    id: 'numbers',
    label: 'The Numbers',
    line: "I'll start with our sales, because they speak for themselves.",
    effects: { goldfin: 12, nova: 6, rex: 4, coral: 2, tiger: -2 },
  },
  {
    id: 'demo',
    label: 'The Demo',
    line: 'Watch this. I’ll show you how it works right now.',
    effects: { tiger: 10, coral: 8, rex: 6, nova: 2, goldfin: 0 },
  },
  {
    id: 'hype',
    label: 'The Hype',
    line: 'Sharks, this is a billion-dollar idea. Get in now or regret it.',
    effects: { tiger: 6, rex: 4, coral: -2, nova: -8, goldfin: -10 },
  },
];

export const TOPIC_ASKERS: Record<Topic, SharkId[]> = {
  sales: ['goldfin', 'rex', 'nova'],
  margin: ['goldfin', 'coral', 'rex'],
  valuation: ['goldfin', 'rex', 'tiger'],
  patent: ['coral', 'tiger', 'rex'],
  competition: ['rex', 'tiger', 'coral'],
  customers: ['coral', 'nova', 'rex'],
  personal: ['nova', 'coral', 'tiger'],
  money: ['nova', 'rex', 'goldfin'],
};

export const EXTRA_TOPICS: Topic[] = ['patent', 'competition', 'customers', 'personal', 'money'];

export const money = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
};

export interface QuestionText {
  q: string;
  answers: Record<AnswerKind, string>;
}

export function questionText(topic: Topic, p: Product, ask: { amount: number; equity: number }): QuestionText {
  const val = money(ask.amount / (ask.equity / 100));
  switch (topic) {
    case 'sales':
      return {
        q: 'What are your sales?',
        answers: {
          honest: `${money(p.sales)} in the last 12 months, growing ${p.growth}% a month.`,
          bold: `${money(p.sales)} so far, and we'll clear a million next year. Guaranteed.`,
          dodge: "Sales are... really starting to pick up. It's complicated.",
        },
      };
    case 'margin':
      return {
        q: 'What does it cost you to make, and what do you sell it for?',
        answers: {
          honest: `${money(p.cost)} to make, ${money(p.price)} retail. That's a ${Math.round((1 - p.cost / p.price) * 100)}% margin.`,
          bold: 'Pennies to make. Our margins are the best in the industry.',
          dodge: "We're still dialing in the costs with our factory.",
        },
      };
    case 'valuation':
      return {
        q: `You're saying this company is worth ${val}. How?`,
        answers: {
          honest: `Fair question. I based it on ${money(p.sales)} in sales and ${p.growth}% monthly growth.`,
          bold: "Honestly? I think it's worth double. You're getting a bargain.",
          dodge: 'That was the number my advisor suggested.',
        },
      };
    case 'patent':
      return {
        q: 'Do you have a patent?',
        answers: {
          honest: p.facts.patent,
          bold: "Nobody can copy us. We're completely protected.",
          dodge: "We've talked to a lawyer about it.",
        },
      };
    case 'competition':
      return {
        q: 'What stops a big brand from knocking you off tomorrow?',
        answers: {
          honest: p.facts.competition,
          bold: "There's no competition. Nobody can do what we do.",
          dodge: "We try not to think about competitors. We focus on us.",
        },
      };
    case 'customers':
      return {
        q: "Who's actually buying this?",
        answers: {
          honest: p.facts.customers,
          bold: 'Everyone. Literally every household in America needs one.',
          dodge: "We're still figuring out our core customer.",
        },
      };
    case 'personal':
      return {
        q: 'Why should I bet on YOU?',
        answers: {
          honest: p.facts.story,
          bold: "Because I'll outwork everyone in this room. Including you.",
          dodge: "Well, I've always wanted to be on this show.",
        },
      };
    case 'money':
      return {
        q: `What exactly is the ${money(ask.amount)} for?`,
        answers: {
          honest: p.facts.money,
          bold: 'A Super Bowl ad. Go big or go home.',
          dodge: 'Honestly, paying back some credit cards first.',
        },
      };
  }
}

export const TOPIC_LABEL: Record<Topic, string> = {
  sales: 'Sales',
  margin: 'Margins',
  valuation: 'Valuation',
  patent: 'Patent',
  competition: 'Competition',
  customers: 'Customers',
  personal: 'Founder',
  money: 'Use of funds',
};
