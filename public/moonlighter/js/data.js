'use strict';
// ============================================================================
//  DATA: items, dungeons, gear, recipes, potions, town investments, customers
// ============================================================================

// item: [name, value, stack, dungeon, weight, icon, pal, pal2?, desc]
const ITEMS = {};
function defItem(id, name, value, stack, dungeon, w, icon, pal, desc, pal2) {
  ITEMS[id] = { id, name, value, stack, dungeon, w, icon, pal, pal2, desc, boss: w === 0 };
}
// --- Golem dungeon
defItem('rich_jelly', 'Rich Jelly', 6, 10, 0, 40, 'jelly', ['#1f6a3a', '#3fae5a', '#8ae68a', '#e8ffe0'], 'Jelly from a slime that ate well. Wobbles when nobody is looking.');
defItem('vine', 'Vine', 5, 10, 0, 40, 'vine', ['#2a5a2a', '#4a8a3a', '#7ac05a', '#c8f0a0'], 'A sturdy vine that grows over the dungeon walls.');
defItem('root', 'Root', 7, 10, 0, 36, 'root', ['#4a2a18', '#7a4a2a', '#a8703a', '#d8a870'], 'Twisted root. Craftsmen use it for handles and bindings.');
defItem('teeth_stone', 'Teeth Stone', 9, 10, 0, 30, 'tooth', ['#5a5a6a', '#9a9aaa', '#d0d0dc', '#ffffff'], 'A stone shaped like a molar. Golems chew on these.');
defItem('broken_sword', 'Broken Sword', 30, 5, 0, 16, 'sword', ['#3e3e4c', '#83839a', '#c3c3d2', '#ffffff'], 'What remains of a less fortunate adventurer.');
defItem('iron_bar', 'Iron Bar', 40, 5, 0, 14, 'bar', ['#3a3a48', '#7a7a8a', '#b8b8c8', '#ffffff'], 'Refined iron, the backbone of any decent forge.');
defItem('glass_lens', 'Glass Lenses', 55, 5, 0, 12, 'lens', ['#4a7a9a', '#8ac0e0', '#c0e8ff', '#ffffff'], 'Glass shaped into a lens with the sole purpose of focusing magical energy.');
defItem('golem_core', 'Golem Core', 90, 5, 0, 9, 'core', ['#2a2a3a', '#4a4a62', '#3fae8f', '#a8f5d0'], 'The still-warm heart of a golem. It hums softly.');
defItem('water_sphere', 'Water Sphere', 120, 5, 0, 7, 'orb', ['#1a4a8a', '#3a8ae0', '#8ad0ff', '#ffffff'], 'Water that forgot how to be a puddle.');
defItem('crystal_energy', 'Crystallized Energy', 160, 5, 0, 6, 'crystal', ['#2a4a8a', '#4a8ae0', '#9ad0ff', '#ffffff'], 'Pure energy, frozen into a crystal. Tingles to the touch.');
defItem('ancient_pot', 'Ancient Pot', 280, 3, 0, 3, 'pot', ['#4a2a2a', '#9a5a3a', '#c88a5a', '#e8c0a0'], 'A pot older than the town itself. Collectors adore these.', { a: '#e0c060' });
defItem('golem_design', 'Golem King Design', 2200, 1, 0, 0, 'scroll', ['#4a3a8a', '#6a5ac0', '#e8dcc0', '#fff8e8'], 'Blueprints etched by the Golem King. Scholars would pay a fortune.');
// --- Forest dungeon
defItem('fabric', 'Fabric', 40, 10, 1, 40, 'cloth', ['#6a3a4a', '#a85a6a', '#d88a9a', '#f8c8d0'], 'Soft woven fibre torn from forest cocoons.');
defItem('tree_bark', 'Tree Bark', 55, 10, 1, 36, 'log', ['#3a2a18', '#6a4a2a', '#8a6a3a', '#b89a5a'], 'Bark from an ancient tree. Tougher than it looks.', { a: '#b89a5a', b: '#e0c890' });
defItem('sap_jelly', 'Sap Jelly', 70, 10, 1, 30, 'jelly', ['#8a4a10', '#d88a20', '#f8c860', '#fff0c0'], 'Sweet amber jelly. Smells of pine.');
defItem('seeds', 'Seeds', 90, 10, 1, 24, 'seed', ['#4a3a18', '#8a6a2a', '#c8a050', '#f0d890'], 'Seeds of the forest dungeon. They sprout in the dark.');
defItem('glow_mushroom', 'Glowing Mushroom', 130, 5, 1, 16, 'mushroom', ['#6a1a2a', '#c83a4a', '#f07a7a', '#ffffff'], 'Faintly luminous. Great for potions, bad for dinners.', { a: '#e8dcc0', b: '#b8a888' });
defItem('carn_leaf', 'Carnivorous Leaf', 180, 5, 1, 12, 'leaf', ['#1a5a2a', '#2a9a3a', '#6ad85a', '#c0ff90'], 'A leaf that still tries to bite.');
defItem('energy_seed', 'Energy Seed', 260, 5, 1, 9, 'seed', ['#1a4a4a', '#2aa0a0', '#6ae8e0', '#e0ffff'], 'A seed brimming with raw life energy.');
defItem('honey_amber', 'Honey Amber', 400, 5, 1, 6, 'amber', ['#7a3a0a', '#d8801a', '#f8b840', '#fff0b0'], 'A little bug trapped forever in golden amber.');
defItem('forest_pearl', 'Forest Pearl', 650, 3, 1, 3, 'orb', ['#4a2a6a', '#9a6ad0', '#d8b0ff', '#ffffff'], 'Formed in the heart of a giant flower.');
defItem('mutae_seed', 'Carnivore Heart', 7000, 1, 1, 0, 'heart', ['#3a1a2a', '#a8304a', '#f06a8a', '#ffffff'], 'The beating heart of the forest guardian.');
// --- Desert dungeon
defItem('bone', 'Bone', 180, 10, 2, 36, 'bone', ['#8a7a5a', '#c8b890', '#ece0c0', '#ffffff'], 'Bleached by an underground sun that should not exist.');
defItem('sand_crystal', 'Sand Crystal', 220, 10, 2, 32, 'crystal', ['#8a5a1a', '#d8a040', '#f8d890', '#ffffff'], 'Sand fused into crystal by ancient heat.');
defItem('scarab_shell', 'Scarab Shell', 320, 5, 2, 24, 'shell', ['#1a3a4a', '#2a7a8a', '#5ac0c0', '#c0f0f0'], 'An iridescent shell. Jewellers love it.');
defItem('silk', 'Desert Silk', 400, 5, 2, 18, 'cloth', ['#8a8a9a', '#c8c8d8', '#ececf8', '#ffffff'], 'Smooth as water, strong as rope.');
defItem('cactus_flower', 'Cactus Flower', 480, 5, 2, 14, 'mushroom', ['#8a2a5a', '#e05aa0', '#ff9ad0', '#ffffff'], 'Blooms once a century. Or once a dungeon run.', { a: '#4aa04a', b: '#2a6a2a' });
defItem('golden_scale', 'Golden Scale', 750, 5, 2, 10, 'scale', ['#8a5a0a', '#d8a020', '#f8e070', '#ffffff'], 'Shed by the great serpent of the sands.');
defItem('naja_fang', 'Serpent Fang', 1100, 3, 2, 6, 'fang', ['#8a8a7a', '#d8d8c8', '#f8f8f0', '#ffffff'], 'Still dripping with venom. Handle with care.');
defItem('desert_gem', 'Desert Gem', 1600, 3, 2, 4, 'gem', ['#6a0a2a', '#c82a4a', '#f86a7a', '#ffffff'], 'A ruby the size of a fist.');
defItem('ancient_mask', 'Ancient Mask', 2400, 1, 2, 2, 'mask', ['#6a4a0a', '#c8901a', '#f8d060', '#ffffff'], 'The face of a forgotten king.', { a: '#2a1a0a', b: '#b83030' });
defItem('naja_crown', 'Serpent Crown', 18000, 1, 2, 0, 'crown', ['#8a5a0a', '#d8a020', '#f8e070', '#ffffff'], 'Crown of the desert guardian.', { a: '#c82a4a' });
// --- Tech dungeon
defItem('copper_wire', 'Copper Wire', 700, 10, 3, 36, 'spool', ['#6a2a0a', '#c86a2a', '#f0a060', '#ffffff'], 'Wire from a civilisation that ran on lightning.', { a: '#4a4a58', b: '#8a8a9a' });
defItem('gear', 'Gear', 900, 10, 3, 30, 'gear', ['#4a4a58', '#8a8a9a', '#c8c8d8', '#ffffff'], 'Precision-cut. Still turning.');
defItem('circuit_plate', 'Circuit Plate', 1200, 5, 3, 22, 'plate', ['#0a3a2a', '#1a6a4a', '#2a9a6a', '#8af0c0'], 'Tiny golden roads for tiny lightning.', { a: '#e0b848', b: '#1a1a1a' });
defItem('energy_cell', 'Energy Cell', 1600, 5, 3, 16, 'cell', ['#3a3a48', '#8a8a9a', '#c8c8d8', '#ffffff'], 'A bottle of lightning. Do not shake.', { a: '#e84aa0' });
defItem('plasma_orb', 'Plasma Orb', 2300, 5, 3, 11, 'orb', ['#6a0a5a', '#d82ab0', '#ff8af0', '#ffffff'], 'Swirling plasma, contained. For now.');
defItem('ai_chip', 'Thinking Chip', 3200, 3, 3, 8, 'chip', ['#1a1a2a', '#3a3a5a', '#6a6a9a', '#c0c0e0'], 'It seems to be thinking about you.', { a: '#e0b848', b: '#3ad8e0' });
defItem('power_core', 'Power Core', 4500, 3, 3, 5, 'core', ['#1a1a2a', '#3a3a5a', '#e84aa0', '#ffc0f0'], 'Powered the guardians of the tech dungeon.');
defItem('quantum_crystal', 'Quantum Crystal', 6000, 3, 3, 3, 'crystal', ['#4a0a6a', '#a02ae0', '#e08aff', '#ffffff'], 'Exists in two places at once. Sells in both.');
defItem('energy_heart', 'Energy Heart', 45000, 1, 3, 0, 'heart', ['#3a0a4a', '#b02ae0', '#f08aff', '#ffffff'], 'The core of the tech guardian. Priceless. Well, almost.');

const ITEM_ORDER = Object.keys(ITEMS);
const BOSS_ITEM = ['golem_design', 'mutae_seed', 'naja_crown', 'energy_heart'];

// ---------------------------------------------------------------- dungeons
const DUNGEONS = [
  {
    id: 'golem', name: 'Golem Dungeon', color: '#3fae8f', boss: 'Golem King', hpMul: 1, dmgMul: 1, pendantCost: 60,
    room: { wall: '#2b2440', brick: '#433a60', brickHi: '#5a4f7c', brickDark: '#1f1a30', floor: '#2c5552', floor2: '#35645f', floor3: '#23443f', pit: '#07070c', edge: '#1a1528', deco: '#1b1626' },
    rock: { id: 'g', rock: '#6a6080', rock2: '#453d5a', rock3: '#8a80a0', moss: '#5ab88a', pot: '#8a5a4a', pot2: '#5a3a30' },
    slime: { id: 'gs', body: '#3fae8f', dark: '#2a7a63', light: '#8af0c8', eye: '#1a1020', core: '#e8f070' },
    stone: { id: 'gg', body: '#6d5a8e', dark: '#473b68', moss: '#4fae80', moss2: '#86deae', eye: '#f2e070' },
    bossPal: { id: 'gb', body: '#7a4a78', dark: '#4a2a4e', moss: '#3f9a6e', moss2: '#7ad8a0', eye: '#f2e070' },
    attacks: ['fist', 'rain', 'spray', 'summon'],
    enemyNames: { slime: 'Baby Slime', golem: 'Golem Warrior', turret: 'Golem Turret', wisp: 'Flying Rock', bigslime: 'Tangle' },
  },
  {
    id: 'forest', name: 'Forest Dungeon', color: '#e0604a', boss: 'Carnivore Mutae', hpMul: 2.6, dmgMul: 2, pendantCost: 250,
    room: { wall: '#27361f', brick: '#3b5230', brickHi: '#52703e', brickDark: '#1a2616', floor: '#3e5a2c', floor2: '#4b6a34', floor3: '#304822', pit: '#07090a', edge: '#16200f', deco: '#1a2413' },
    rock: { id: 'f', rock: '#7a6a4a', rock2: '#524630', rock3: '#9a8a60', moss: '#6ad05a', pot: '#8a6a3a', pot2: '#5a4424' },
    slime: { id: 'fs', body: '#8ac04a', dark: '#5a8a2a', light: '#d0f08a', eye: '#1a1020', core: '#e04a4a' },
    stone: { id: 'fg', body: '#7a5a3a', dark: '#553c26', moss: '#3a9a3a', moss2: '#72d45e', eye: '#ff6a4a' },
    bossPal: { id: 'fb', body: '#6a3a2a', dark: '#44241a', moss: '#2a8a3a', moss2: '#e05a6a', eye: '#ff6a4a' },
    attacks: ['fist', 'spray', 'summon', 'rain'],
    enemyNames: { slime: 'Sprout Slime', golem: 'Bark Warrior', turret: 'Spitter Plant', wisp: 'Pollen Wisp', bigslime: 'Moss Heap' },
  },
  {
    id: 'desert', name: 'Desert Dungeon', color: '#9f8fe0', boss: 'Sand Serpent', hpMul: 6, dmgMul: 3.4, pendantCost: 800,
    room: { wall: '#5e4128', brick: '#7c5a34', brickHi: '#9a7646', brickDark: '#3e2a18', floor: '#b48e58', floor2: '#c49e66', floor3: '#9c7846', pit: '#0c0806', edge: '#3a2816', deco: '#4a3420' },
    rock: { id: 'd', rock: '#c8a878', rock2: '#8a7048', rock3: '#e0c898', moss: '#d05a3a', pot: '#c86a3a', pot2: '#8a4424' },
    slime: { id: 'ds', body: '#e0a040', dark: '#a8702a', light: '#f8e0a0', eye: '#1a1020', core: '#ffffff' },
    stone: { id: 'dg', body: '#c8a060', dark: '#8a6a3a', moss: '#c8503a', moss2: '#f08a5a', eye: '#5ae0ff' },
    bossPal: { id: 'db', body: '#c89040', dark: '#7a5424', moss: '#b83a3a', moss2: '#f0c050', eye: '#5ae0ff' },
    attacks: ['rain', 'spray', 'fist', 'summon'],
    enemyNames: { slime: 'Sand Slime', golem: 'Mummy Guard', turret: 'Sand Totem', wisp: 'Dust Spirit', bigslime: 'Dune Blob' },
  },
  {
    id: 'tech', name: 'Tech Dungeon', color: '#c24aa8', boss: 'Energy Being', hpMul: 12, dmgMul: 5.2, pendantCost: 2400,
    room: { wall: '#1c2030', brick: '#2c3246', brickHi: '#3e4764', brickDark: '#12141e', floor: '#283040', floor2: '#303a4e', floor3: '#1f2632', pit: '#030308', edge: '#10121a', deco: '#3ad8e0' },
    rock: { id: 't', rock: '#5a6070', rock2: '#3a3e4a', rock3: '#7a8090', moss: '#3ad8e0', pot: '#5a6070', pot2: '#3a3e4a' },
    slime: { id: 'ts', body: '#4ac0e0', dark: '#2a7aa0', light: '#b0f0ff', eye: '#1a1020', core: '#ff5ac0' },
    stone: { id: 'tg', body: '#5a6070', dark: '#3a3e4a', moss: '#b03aa0', moss2: '#e06ad0', eye: '#5afff0' },
    bossPal: { id: 'tb', body: '#4a5068', dark: '#2a2e40', moss: '#9a2ab0', moss2: '#3ad8e0', eye: '#ff5ae0' },
    attacks: ['spray', 'rain', 'summon', 'fist'],
    enemyNames: { slime: 'Plasma Slime', golem: 'Sentry Bot', turret: 'Laser Turret', wisp: 'Drone', bigslime: 'Ooze Tank' },
  },
];
DUNGEONS.forEach((d, i) => { d.idx = i; d.loot = ITEM_ORDER.filter(id => ITEMS[id].dungeon === i && !ITEMS[id].boss); });

// base enemy stats (scaled by dungeon & floor)
const ENEMY_BASE = {
  slime: { hp: 22, dmg: 7, spd: 0, r: 6 },
  golem: { hp: 70, dmg: 14, spd: 30, r: 8 },
  turret: { hp: 45, dmg: 10, spd: 0, r: 7 },
  wisp: { hp: 28, dmg: 9, spd: 36, r: 6 },
  bigslime: { hp: 95, dmg: 12, spd: 16, r: 11 },
};

// ---------------------------------------------------------------- gear
const WEAPON_LINES = {
  sword: { name: 'Short Sword', kind: 'sword', icon: 'sword', dmg: [14, 30, 64, 130], names: ['Training Short Sword', 'Soldier Short Sword', 'Knight Short Sword', 'Hero Short Sword'], desc: 'Fast three-hit combo. Hold Y to raise the shield and block.' },
  big: { name: 'Big Sword', kind: 'big', icon: 'big', dmg: [26, 56, 118, 236], names: ['Training Big Sword', 'Soldier Big Sword', 'Knight Big Sword', 'Hero Big Sword'], desc: 'Slow and brutal. Y performs a charged spin.' },
  spear: { name: 'Spear', kind: 'spear', icon: 'spear', dmg: [16, 34, 72, 146], names: ['Training Spear', 'Soldier Spear', 'Knight Spear', 'Hero Spear'], desc: 'Long reach thrusts. Y sweeps a wide arc.' },
  gloves: { name: 'Gloves', kind: 'gloves', icon: 'gloves', dmg: [8, 18, 38, 78], names: ['Training Gloves', 'Soldier Gloves', 'Knight Gloves', 'Hero Gloves'], desc: 'Rapid punches with a strong finisher. Y dashes forward.' },
  bow: { name: 'Bow', kind: 'bow', icon: 'bow', dmg: [11, 24, 50, 100], names: ['Training Bow', 'Soldier Bow', 'Knight Bow', 'Hero Bow'], desc: 'Shoots arrows. Hold Y to charge a piercing shot.' },
};
const ARMOR_LINES = {
  helm: { name: 'Helmet', icon: 'helm', hp: [10, 25, 50, 90], def: [2, 4, 7, 11], spd: [0, 0, 0, 0], names: ['Fabric Bandana', 'Iron Helmet', 'Steel Helmet', 'Warden Helmet'] },
  chest: { name: 'Chest', icon: 'chest', hp: [20, 50, 100, 180], def: [4, 8, 13, 20], spd: [0, 0, 0, 0], names: ['Fabric Tunic', 'Iron Chestplate', 'Steel Chestplate', 'Warden Chestplate'] },
  boots: { name: 'Boots', icon: 'boots', hp: [5, 15, 30, 60], def: [1, 3, 5, 8], spd: [4, 7, 10, 14], names: ['Fabric Boots', 'Iron Boots', 'Steel Boots', 'Warden Boots'] },
};
const TIER_MATS = [
  [['teeth_stone', 4], ['iron_bar', 1]],
  [['iron_bar', 3], ['golem_core', 2], ['crystal_energy', 1]],
  [['tree_bark', 4], ['energy_seed', 2], ['honey_amber', 1]],
  [['golden_scale', 2], ['naja_fang', 1], ['copper_wire', 3]],
];
const LINE_EXTRA = {
  sword: [null, null, null, null],
  big: [['root', 3], ['broken_sword', 2], ['seeds', 3], ['bone', 4]],
  spear: [['root', 4], ['glass_lens', 1], ['carn_leaf', 1], ['sand_crystal', 3]],
  gloves: [['rich_jelly', 4], ['water_sphere', 1], ['fabric', 3], ['silk', 2]],
  bow: [['vine', 5], ['glass_lens', 2], ['sap_jelly', 3], ['scarab_shell', 2]],
};
const ARMOR_MATS = [
  [['vine', 4], ['root', 3]],
  [['iron_bar', 2], ['teeth_stone', 5], ['glass_lens', 1]],
  [['fabric', 4], ['sap_jelly', 3], ['carn_leaf', 2]],
  [['silk', 3], ['scarab_shell', 3], ['desert_gem', 1]],
];
function gearRecipe(line, tier) {
  if (WEAPON_LINES[line]) {
    const gold = [220, 1500, 6500, 22000][tier];
    const mats = TIER_MATS[tier].map(m => m.slice());
    const ex = LINE_EXTRA[line][tier]; if (ex) mats.push(ex.slice());
    return { gold, mats };
  }
  const gold = [120, 900, 4500, 16000][tier] * (line === 'chest' ? 1.4 : 1) | 0;
  return { gold, mats: ARMOR_MATS[tier].map(m => m.slice()) };
}
const POTIONS = [
  { name: 'HP Potion I', heal: 40, gold: 60, mats: [['rich_jelly', 1]], desc: 'Restores 40 Health. Should always have one or two of these on hand.' },
  { name: 'HP Potion II', heal: 80, gold: 300, mats: [['rich_jelly', 2], ['water_sphere', 1]], desc: 'Restores 80 Health. A dungeon-diver\'s best friend.' },
  { name: 'HP Potion III', heal: 150, gold: 1500, mats: [['sap_jelly', 2], ['glow_mushroom', 1]], desc: 'Restores 150 Health. Tastes like a forest.' },
  { name: 'HP Potion IV', heal: 300, gold: 5000, mats: [['cactus_flower', 1], ['energy_cell', 1]], desc: 'Restores 300 Health. Crackles on the tongue.' },
];
const POTION_CAP = 5;

const INVEST = [
  { id: 'forge', name: "Brom's Anvil", who: 'Blacksmith', cost: [500], desc: 'Do you feel the Dungeons are too hard? Tired of your old weapon? Bring me enough money and materials and I will forge you something to be reckoned with.' },
  { id: 'witch', name: 'Copper Cauldron', who: 'Potion Shop', cost: [500], desc: 'Potions, brews, tonics. Bring me jellies and I will keep you alive down there, dear.' },
  { id: 'shop', name: 'Shop Expansion', who: 'Carpenter', cost: [3000, 14000], desc: 'A bigger shop means more tables, and richer customers will start to visit.' },
  { id: 'decor', name: 'Decorator', who: 'Decorator', cost: [1500], desc: 'A cozy shop makes people generous. Customers tolerate slightly higher prices and more of them come by.' },
  { id: 'bank', name: 'Banker', who: 'Banker', cost: [2500], desc: 'Leave your gold with me. It will grow a little every morning (2% daily, up to 1,000).' },
];

// ---------------------------------------------------------------- customers
const LOOKS = [];
(function buildLooks() {
  const skins = ['#f0c49a', '#e0a878', '#c8865a', '#9a6040', '#f6d6b8'];
  const hairs = ['#6a4028', '#2a2020', '#d8b050', '#b0482a', '#8a8a8a', '#4a3020', '#f0e0c0'];
  const shirts = ['#8aa860', '#c86a4a', '#5a8ac8', '#b88ad8', '#d8a848', '#6ab8a8', '#c84a6a', '#8a6a4a'];
  const pants = ['#5a4634', '#3a3a5a', '#4a5a3a', '#6a4a3a'];
  const r = mulberry32(1234);
  const pick = a => a[Math.floor(r() * a.length)];
  for (let i = 0; i < 28; i++) {
    const kind = i < 6 ? 'kid' : i < 14 ? 'lady' : i < 18 ? 'rich' : i < 22 ? 'adventurer' : 'villager';
    const o = { id: 'look' + i, kind, skin: pick(skins), hair: pick(hairs), shirt: pick(shirts), pants: pick(pants), hairStyle: pick(['short', 'short', 'bald', 'long']) };
    if (kind === 'kid') { o.kid = true; o.hairStyle = pick(['short', 'long']); }
    if (kind === 'lady') { o.hairStyle = pick(['long', 'bun']); o.dress = pick(['#c86a8a', '#6a8ac8', '#d8a848', '#8ac0a0', '#a86ad8']); }
    if (kind === 'rich') { o.shirt = pick(['#5a2a6a', '#2a3a6a', '#6a1a2a']); o.hat = 'cap'; o.hatCol = '#2a2a3a'; o.scarf = '#e0c060'; o.wide = r() < 0.5; }
    if (kind === 'adventurer') { o.hat = 'bandana'; o.hatCol = pick(['#c84a4a', '#4a8ac8', '#4aa05a']); o.scarf = '#8a6a4a'; }
    if (kind === 'villager' && r() < 0.4) { o.beard = o.hair; }
    LOOKS.push(o);
  }
})();
const THIEF_LOOK = { id: 'thief', hat: 'hood', hatCol: '#3a3446', mask: '#1a1620', shirt: '#4a4456', pants: '#2a2630', skin: '#e0b088' };
const NPC_LOOKS = {
  elder: { id: 'elder', skin: '#f0c49a', hair: '#f4f0e8', hairStyle: 'bald', beard: '#f4f0e8', shirt: '#5e7a3e', pants: '#4a3a2a' },
  smith: { id: 'smith', skin: '#e8b88a', hair: '#3a2a28', beard: '#6a4028', shirt: '#d8723a', apron: '#5e7a3e', pants: '#4a3a4a', wide: true },
  witch: { id: 'witch', skin: '#f0c8a0', hair: '#6ad8a8', hairStyle: 'long', dress: '#b8485a', shirt: '#e0a040', hat: 'witch', hatCol: '#5a3a6a' },
  mayor: { id: 'mayor', skin: '#e8b890', hair: '#2a2a3a', shirt: '#3a4a7a', pants: '#2a2a3a', hat: 'cap', hatCol: '#2a2a3a', beard: '#7a5a3a' },
};
const CUSTOMER_KINDS = {
  kid: { tol: 0.97, budget: 250 },
  villager: { tol: 1.0, budget: 2500 },
  lady: { tol: 1.03, budget: 6000 },
  adventurer: { tol: 1.0, budget: 15000 },
  rich: { tol: 1.1, budget: 250000 },
};

const ELDER_LINES = [
  ['Ah, the young shopkeeper. The dungeons open their gates every night... and every day, if you are brave.', 'Bring back what you find, set it on your tables, and watch your customers\' faces.'],
  ['A customer who smiles too widely got a bargain. A customer who frowns thinks you are a thief.', 'Write every reaction in your notebook. It remembers so you don\'t have to.'],
  ['If a price is a bit steep, some will still buy... but word gets around. The item will lose popularity.'],
  ['Thieves! They love a crowded shop. If you see one running for the door, roll into them!'],
  ['Your merchant pendant will bring you home from the depths... for a fee. Gold well spent if your bag is full.'],
  ['The top row of your bag is sewn tight. Should you fall in the dungeon, those five pockets will come home with you.'],
  ['Cursed items... some break their neighbours, some change shape, some only fit at the edges. Read them carefully.'],
  ['Go on, now. These weary bones of mine need rest.'],
];
const VILLAGER_LINES = [
  'Lovely night, isn\'t it?', 'I heard the forest dungeon has plants that bite!', 'Your shop smells like adventure.',
  'My grandfather opened a dungeon gate once. We don\'t talk about it.', 'Will you be selling jelly tomorrow?',
  'The gates hum louder at night...', 'Rumour says there\'s a fifth door no one can open.',
];
const TIPS = {
  pendant: { title: 'Merchant Pendant', lines: ['Hold HOME (F) to use your pendant.', 'It costs gold, but you keep everything in your bag.', 'Dying loses everything except the top row!'] },
  shop: { title: 'Running the Shop', lines: ['Place items on tables and set a price.', 'Watch each customer\'s face: it tells you if the price is right.', 'Stand at the register and press A to charge customers.'] },
};
