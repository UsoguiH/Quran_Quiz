export type SharkId = 'rex' | 'goldfin' | 'coral' | 'tiger' | 'nova';
export type Category = 'home' | 'pets' | 'food';
export type ProductId = 'glow' | 'pup' | 'kelp';
export type Strength = 'strong' | 'ok' | 'weak';
/** The three kinds of question the Sharks fire during the grilling. */
export type QType = 'numbers' | 'proof' | 'story';
export type DealStyle = 'equity' | 'royalty' | 'cash' | 'loan';

export interface Shark {
  id: SharkId;
  name: string;
  short: string;
  title: string;
  loves: Category[];
  dislikes: Category[];
  /** Which question types this Shark likes to fire, most likely first. */
  asks: QType[];
  style: DealStyle;
  patience: number;
  hair: 'short' | 'bald' | 'long' | 'spiky' | 'bun';
  glasses?: boolean;
  hoodie?: boolean;
  palette: Record<string, string>;
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
    asks: ['numbers', 'proof', 'story'],
    style: 'equity',
    patience: 2,
    hair: 'short',
    palette: {
      h: '#5a3421', H: '#3d2317', s: '#f0c29a', S: '#d49a73',
      c: '#2c4a7a', C: '#1f3559', t: '#c8452f', p: '#243a5e',
    },
  },
  goldfin: {
    id: 'goldfin',
    name: 'Mr. Goldfin',
    short: 'Goldfin',
    title: 'The Royalty Man',
    loves: [],
    dislikes: ['food'],
    asks: ['numbers', 'numbers', 'proof'],
    style: 'royalty',
    patience: 1,
    hair: 'bald',
    glasses: true,
    palette: {
      h: '#c9c2b5', H: '#9a9285', s: '#f2cfae', S: '#d6ad89',
      c: '#26262e', C: '#15151a', t: '#1f9e87', p: '#1c1c22',
    },
  },
  coral: {
    id: 'coral',
    name: 'Coral Vance',
    short: 'Coral',
    title: 'Queen of Home Shopping',
    loves: ['home', 'pets'],
    dislikes: [],
    asks: ['story', 'proof', 'numbers'],
    style: 'equity',
    patience: 2,
    hair: 'long',
    palette: {
      h: '#d9582e', H: '#a83d1c', s: '#f6d0ae', S: '#dcae8a',
      c: '#1f9e87', C: '#146e5f', t: '#f4e6c4', p: '#1b5e52',
    },
  },
  tiger: {
    id: 'tiger',
    name: 'Tiger Mako',
    short: 'Tiger',
    title: 'The Tech Maverick',
    loves: ['pets'],
    dislikes: ['food'],
    asks: ['proof', 'proof', 'numbers'],
    style: 'cash',
    patience: 1,
    hair: 'spiky',
    hoodie: true,
    palette: {
      h: '#1c1c24', H: '#0f0f14', s: '#c98d62', S: '#a86f48',
      c: '#e8793a', C: '#b85a28', t: '#e8793a', p: '#3a3f4a',
    },
  },
  nova: {
    id: 'nova',
    name: 'Nova Reyes',
    short: 'Nova',
    title: 'The Clean-Label Investor',
    loves: ['food'],
    dislikes: [],
    asks: ['story', 'numbers', 'story'],
    style: 'loan',
    patience: 3,
    hair: 'bun',
    palette: {
      h: '#2d1b14', H: '#1a0f0b', s: '#8d5a3b', S: '#6e432b',
      c: '#6d4a9e', C: '#4f3478', t: '#f2b134', p: '#3f2d5c',
    },
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
  /** How well the product stands up to each question type. Weak = armored questions. */
  grill: Record<QType, Strength>;
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
    grill: { numbers: 'ok', proof: 'weak', story: 'strong' },
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
    grill: { numbers: 'ok', proof: 'strong', story: 'ok' },
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
    grill: { numbers: 'weak', proof: 'weak', story: 'strong' },
  },
};

export const PRODUCT_ORDER: ProductId[] = ['glow', 'pup', 'kelp'];

const MULTIPLE: Record<Category, number> = { home: 3.5, pets: 3, food: 4 };

export function fairValue(p: Product): number {
  return p.sales * MULTIPLE[p.category] * (1 + p.growth / 40);
}

export const QTYPES: QType[] = ['numbers', 'proof', 'story'];

export const QTYPE_LABEL: Record<QType, string> = {
  numbers: 'Numbers',
  proof: 'Proof',
  story: 'Story',
};

export const money = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n % 1 === 0 ? n : n.toFixed(2)}`;
};
