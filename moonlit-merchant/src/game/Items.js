// Item, weapon, armor and recipe definitions.
// `base` is the hidden "true" value customers judge prices against.

export const ITEMS = {
  gel: {
    name: 'Glowing Gel',
    desc: 'Wobbly goo left behind by Gloop slimes. Still warm.',
    base: 28,
    stack: 10,
    rarity: 'common',
  },
  twig: {
    name: 'Whisperwood Twig',
    desc: 'A branch that hums softly when the wind blows.',
    base: 16,
    stack: 10,
    rarity: 'common',
  },
  bone: {
    name: 'Old Bone',
    desc: 'Nobody knows whose. Nobody asks.',
    base: 22,
    stack: 10,
    rarity: 'common',
  },
  iron: {
    name: 'Rusted Iron',
    desc: 'Scrap from the ruin guardians. The smith loves it.',
    base: 42,
    stack: 10,
    rarity: 'common',
  },
  fabric: {
    name: 'Tattered Silk',
    desc: 'Once-royal cloth, faded by centuries of darkness.',
    base: 64,
    stack: 10,
    rarity: 'uncommon',
  },
  amber: {
    name: 'Honey Amber',
    desc: 'Fossilised sap from the Rootlings. Smells sweet.',
    base: 115,
    stack: 10,
    rarity: 'uncommon',
  },
  scroll: {
    name: 'Faded Scroll',
    desc: 'Half a recipe for something that no longer exists.',
    base: 145,
    stack: 5,
    rarity: 'uncommon',
  },
  crystal: {
    name: 'Azure Crystal',
    desc: 'A crystal that glows with trapped moonlight.',
    base: 190,
    stack: 5,
    rarity: 'rare',
  },
  feather: {
    name: 'Ember Feather',
    desc: 'Burns without being consumed.',
    base: 250,
    stack: 5,
    rarity: 'rare',
  },
  gear: {
    name: 'Ancient Cog',
    desc: 'Precision machinery from a forgotten civilisation.',
    base: 330,
    stack: 5,
    rarity: 'rare',
  },
  wisp: {
    name: 'Bottled Wisp',
    desc: 'A captured spirit-light. It seems... content?',
    base: 460,
    stack: 5,
    rarity: 'rare',
  },
  core: {
    name: 'Warden Core',
    desc: 'The pulsing heart-stone of a Stone Warden.',
    base: 680,
    stack: 5,
    rarity: 'epic',
  },
  rune: {
    name: 'Golden Rune',
    desc: 'A tablet of pure gold etched with living glyphs.',
    base: 920,
    stack: 3,
    rarity: 'epic',
  },
  pearl: {
    name: 'Moon Pearl',
    desc: 'Said to be a tear of the moon itself.',
    base: 2300,
    stack: 1,
    rarity: 'legendary',
  },
  heart: {
    name: 'Colossus Heart',
    desc: 'Still beating. Very slowly.',
    base: 3600,
    stack: 1,
    rarity: 'legendary',
  },
  crown: {
    name: 'Hollow Crown',
    desc: 'The crown of the ruin king. Heavy with history.',
    base: 5200,
    stack: 1,
    rarity: 'legendary',
  },
  potion_s: {
    name: 'Healing Tonic',
    desc: 'Restores 40 health. Press F to drink (or H to quick-heal).',
    base: 70,
    stack: 5,
    rarity: 'uncommon',
    heal: 40,
  },
  potion_l: {
    name: 'Grand Elixir',
    desc: 'Restores 100 health. Tastes like starlight.',
    base: 240,
    stack: 5,
    rarity: 'rare',
    heal: 100,
  },
};

export const WEAPONS = {
  sword_1: { type: 'sword', name: 'Bronze Sword', dmg: 14, tier: 1, desc: 'Fast three-hit combo. Hold RMB to raise your shield.' },
  sword_2: { type: 'sword', name: 'Crystal Edge', dmg: 26, tier: 2, desc: 'A blade grown from azure crystal.' },
  sword_3: { type: 'sword', name: 'Moonlit Blade', dmg: 42, tier: 3, desc: 'Forged under a full moon. Hums in the dark.' },
  great_1: { type: 'great', name: 'Heavy Cleaver', dmg: 34, tier: 1, desc: 'Slow, wide sweeping swings with huge knockback.' },
  great_2: { type: 'great', name: 'Runed Greatsword', dmg: 58, tier: 2, desc: 'Golden runes crackle along the blade.' },
  great_3: { type: 'great', name: 'Colossus Breaker', dmg: 90, tier: 3, desc: 'Made from the heart of a giant.' },
  bow_1: { type: 'bow', name: 'Hunter Bow', dmg: 20, tier: 1, desc: 'Hold LMB to draw, release to fire. Longer draw = more damage.' },
  bow_2: { type: 'bow', name: 'Wisp Bow', dmg: 32, tier: 2, desc: 'Arrows glow with spirit-light.' },
  bow_3: { type: 'bow', name: 'Starfall Bow', dmg: 50, tier: 3, desc: 'Each arrow burns like a falling star.' },
};

export const ARMOR = [
  { name: 'Traveler Garb', reduce: 0, hp: 0 },
  { name: 'Iron Mail', reduce: 0.15, hp: 20 },
  { name: 'Crystal Plate', reduce: 0.28, hp: 40 },
  { name: 'Moon Aegis', reduce: 0.42, hp: 70 },
];

// Blacksmith recipes. `requires` = weapon that is upgraded (consumed).
export const FORGE_RECIPES = [
  { id: 'bow_1', kind: 'weapon', cost: 150, mats: { twig: 4, fabric: 1 } },
  { id: 'great_1', kind: 'weapon', cost: 250, mats: { iron: 5, bone: 2 } },
  { id: 'sword_2', kind: 'weapon', requires: 'sword_1', cost: 600, mats: { crystal: 3, iron: 3 } },
  { id: 'bow_2', kind: 'weapon', requires: 'bow_1', cost: 700, mats: { wisp: 2, amber: 2 } },
  { id: 'great_2', kind: 'weapon', requires: 'great_1', cost: 900, mats: { rune: 1, gear: 2, iron: 4 } },
  { id: 'sword_3', kind: 'weapon', requires: 'sword_2', cost: 2400, mats: { core: 2, rune: 2 } },
  { id: 'bow_3', kind: 'weapon', requires: 'bow_2', cost: 2600, mats: { feather: 3, rune: 1, pearl: 1 } },
  { id: 'great_3', kind: 'weapon', requires: 'great_2', cost: 3000, mats: { heart: 1, core: 2 } },
  { id: 'armor_1', kind: 'armor', tier: 1, cost: 300, mats: { iron: 6, fabric: 2 } },
  { id: 'armor_2', kind: 'armor', tier: 2, cost: 950, mats: { crystal: 4, gear: 2 } },
  { id: 'armor_3', kind: 'armor', tier: 3, cost: 3200, mats: { core: 3, pearl: 1 } },
];

export const POTION_RECIPES = [
  { id: 'potion_s', cost: 30, mats: { gel: 2 } },
  { id: 'potion_s', cost: 150, mats: {}, label: 'Buy' },
  { id: 'potion_l', cost: 120, mats: { wisp: 1, amber: 2 } },
];

export const SHOP_UPGRADES = [
  { id: 'expand', name: 'Shop Expansion', desc: 'Adds two more display tables (6 total).', cost: 1200 },
  { id: 'rug', name: 'Velvet Rug', desc: 'Customers tolerate prices 8% higher.', cost: 800 },
  { id: 'chandelier', name: 'Crystal Chandelier', desc: 'More customers visit, and more often.', cost: 1500 },
  { id: 'bag', name: "Traveler's Pack", desc: 'Adds a fifth row to your bag (+5 slots).', cost: 2000 },
  { id: 'pendant', name: 'Polished Pendant', desc: 'Teleporting home from the dungeon costs half as much.', cost: 1800 },
];

// Loot tables per dungeon floor: [itemId, weight]
export const LOOT_TABLES = {
  1: [
    ['gel', 30],
    ['twig', 30],
    ['bone', 22],
    ['iron', 18],
    ['fabric', 10],
    ['amber', 6],
    ['scroll', 3],
    ['crystal', 2],
  ],
  2: [
    ['gel', 12],
    ['iron', 20],
    ['fabric', 16],
    ['amber', 14],
    ['scroll', 10],
    ['crystal', 12],
    ['gear', 8],
    ['wisp', 6],
    ['feather', 4],
  ],
  3: [
    ['iron', 10],
    ['amber', 10],
    ['crystal', 14],
    ['gear', 14],
    ['wisp', 12],
    ['feather', 10],
    ['core', 8],
    ['rune', 5],
  ],
};

export const ENEMY_DROPS = {
  slime: [
    ['gel', 70],
    ['amber', 8],
    ['crystal', 3],
  ],
  rootling: [
    ['twig', 60],
    ['amber', 25],
    ['scroll', 5],
  ],
  golem: [
    ['iron', 50],
    ['gear', 22],
    ['core', 8],
    ['crystal', 10],
  ],
  wisp: [
    ['wisp', 30],
    ['crystal', 25],
    ['feather', 20],
    ['fabric', 20],
  ],
};

export function pickWeighted(table, rng = Math.random) {
  let total = 0;
  for (const [, w] of table) total += w;
  let r = rng() * total;
  for (const [id, w] of table) {
    r -= w;
    if (r <= 0) return id;
  }
  return table[table.length - 1][0];
}

export function itemName(id) {
  return ITEMS[id]?.name ?? WEAPONS[id]?.name ?? id;
}
