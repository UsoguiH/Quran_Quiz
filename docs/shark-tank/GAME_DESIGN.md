# Shark Tank: The Pitch (game design)

A short, replayable pitch game drawn as cozy pixel art. You play a founder
who walks into the Tank, pitches one product to five investors ("Sharks"),
survives their questions and negotiates a deal. The camera is first person
the whole way: you see the room, the Sharks and your product the way the
founder would.

A full run takes 6 to 10 minutes. Each run changes with the product you
pick, the ask you set, how you open, and how you answer.

---

## 1. Visual direction

The look follows the warm top-down pixel style of the reference screenshots,
rebuilt for a first-person camera.

| Element | Reference cue | In this game |
|---|---|---|
| Palette | Warm woods, olive and gold grass, one saturated teal | Walnut floors and panels, gold lamp light, teal banners and accents, deep blue-teal "tank" water behind the Sharks |
| Banners | Big teal cloth banner with scalloped edge and cream emblem | Hangs over the Sharks' chairs with a cream fin emblem; smaller ones in the hallway |
| Doors and light | Red double door with a warm light path on the ground | The Tank doors at the end of the hallway throw a light path toward the camera |
| Speech bubbles | Round cream bubbles with pixel faces or numbers (`126`, `2221`) | Shark reactions (faces), questions (`!`), offers (`$150K / 20%`), exits (`OUT`) |
| Button prompt | Dark round `A` badge beside a pale pill (`A Enter`) | Every "continue" or "enter" prompt |
| Bottom dial | Cream half-dial with small triangles and a teal orb | Sits on top of the dialog card; the triangles light up as you get through the five questions |
| Signposts | Small orange wooden sign with an icon | Shark name plates under each chair |
| Bunting | Rope with small teal flags across the top | Strung across the workshop and hallway ceilings |

Rendering: every scene is drawn on a 384 x 216 canvas and scaled up with
nearest-neighbour filtering. The HUD (bubbles, cards, pills, plates) is HTML
laid over the canvas and sized in the same art-pixel unit, so it stays crisp
and lines up with the sprites at any screen size. The only font is
Pixelify Sans.

---

## 2. Full flow

```
Title ─▶ Workshop (pick product) ─▶ Ledger (set your ask) ─▶ Hallway (producer briefing)
                                                                    │
                                                         A: Enter the Tank (doors open)
                                                                    ▼
Epilogue ◀─ Deal / Walk-out ◀─ Negotiation ◀─ Offers ◀─ Q&A x5 ◀─ Opener ◀─ Intro
   │
   └─▶ Play again
```

### 2.1 Title
- Exterior of the studio in afternoon light: wooden hall, giant teal banner,
  red door, light path on the grass, wheat, an autumn tree.
- Logo, best grade from earlier runs (stored locally), `A Start` prompt.

### 2.2 Workshop: pick your product
- First person at your garage workbench at 2 AM, the night before the pitch.
- Three prototypes sit on little wooden stands with price bubbles above them.
- Left/right to browse, `A` to choose. A card shows the facts that matter
  later: 12-month sales, monthly growth, unit cost versus price, patent status.

| Product | Category | Price / cost | 12-mo sales | Growth | Patent | Strong at | Weak at |
|---|---|---|---|---|---|---|---|
| Glow Jar, a self-watering herb jar that glows when thirsty | Home | $39 / $9 | $186K | 12%/mo | Pending | Margins, customers, story | One factory, so copycats are a risk |
| Pup Pod, a treat-tossing pet camera | Pets / tech | $129 / $71 | $420K | 4%/mo | Granted | Sales, patent | Thin margins |
| Kelp Crunch, sea-salt seaweed chips kids eat | Food | $4 / $1.60 | $92K | 22%/mo | None | Growth, customers, story | Small sales, no patent |

### 2.3 Ledger: set your ask
- Two sliders: amount ($50K to $500K in $25K steps) and equity (5% to 40%).
- The implied valuation updates live (`amount / equity`).
- A "Shark-o-meter" hint compares it to what your numbers can justify.
  Each product has a fair value (`sales x category multiple x growth
  bonus`). Asking far above it makes every Shark start colder.

### 2.4 Hallway: producer briefing
- First person down a wood-panelled corridor toward the red Tank doors, with
  the light path on the floor.
- Pia the producer gives two tips drawn from your product's weak spots.
- The `A Enter` prompt appears at the doors. Pressing it swings them open in a
  flash of light and cuts to the Tank.

### 2.5 Intro
- The five Sharks sit in leather chairs on an arc, name plates in front, the
  teal banner above them and the aquarium walls glowing behind.
- You deliver the standard line: "I'm seeking $X for Y% of my company."

### 2.6 Opener (pitch style)
Choose one of four openers. Each Shark reacts with a face bubble.

| Opener | Who likes it | Who doesn't |
|---|---|---|
| The Story | Coral, Nova | Mr. Goldfin |
| The Numbers | Mr. Goldfin, Nova, Rex | Tiger |
| The Demo | Tiger, Coral, Rex | |
| The Hype | Tiger, Rex | Mr. Goldfin, Nova |

### 2.7 Q&A (five questions)
- Questions 1, 2 and 4 are always sales, margins and valuation. Questions 3
  and 5 are picked at random from patent, competition, customers, founder
  story and use of funds.
- The Shark who cares most about the topic asks it, with a `!` bubble.
- Three answers: **Honest**, **Bold**, **Dodge**. The answer text is written
  from the product's real numbers.
- The effect depends on how strong the product is on that topic:
  - Honest: +10 when strong, +5 when OK, -3 when weak.
  - Bold: +12 when strong, +4 when OK, -10 when weak (you get called out).
  - Dodge: always -8, and worse for the Shark who asked.
- Each Shark weighs styles differently (Mr. Goldfin and Nova reward honesty,
  Tiger and Rex reward boldness) and gets a small bonus for their favourite
  categories.
- **Confidence** (five fin pips, top right) rises with good answers and falls
  with bad ones. It scales how much good answers help (x0.7 to x1.2).
- A Shark whose interest falls below 22 says "I'm out", with a reason. Their
  chair dims and an `OUT` bubble appears.
- The half-dial's triangles light up one by one as the questions pass.

### 2.8 Offers
Every Shark still in either drops out (interest below 50) or makes an offer:

- Their view of your valuation is `fair value x (0.55 + interest / 150)`,
  never more generous than your ask.
- Equity = amount / their valuation.
- Each Shark has a deal style:
  - Rex: straight equity.
  - Mr. Goldfin: less equity plus a $1-per-unit royalty.
  - Coral: straight equity, generous when she loves the category.
  - Tiger: 25% more money for more equity.
  - Nova: half the cash as a loan at 8% for less equity.
- Offers show as number bubbles above the Sharks.

### 2.9 Negotiation
- Offer cards list each Shark's terms. For each one you can **Accept**,
  **Counter** (equity slider), or you can **Walk away** from all of them.
- Every Shark has a hidden walk-away floor (`minEquity`) and a patience of
  1 to 3 counters.
  - Counter at or above the floor: they accept.
  - Below the floor with patience left: they meet you halfway.
  - Out of patience: they pull the offer.
- Each counter cools the other Sharks a little (-4 interest). Anyone who
  drops under 50 withdraws.

### 2.10 Deal or walk-out
- A deal plays a handshake line, confetti and a gold "DEAL" banner.
- No deal dims the lights and plays the walk-out line.

### 2.11 Epilogue: six months later
- Back in the workshop, now stacked with boxes in proportion to how well
  things went.
- Six-month revenue = half the yearly sales x growth x the Shark's boost x
  buzz. Rex boosts home and food, Coral boosts home and pets, Tiger boosts
  pets and tech, Nova boosts food, and Mr. Goldfin gives a flat boost. With
  no deal you still get a small on-air bump (x1.15). Every answer that
  landed adds 3% buzz.
- Score = the value of the stake you still own, compared with what the
  company would have been worth in six months without the show. Loans are
  debt and royalties come off the top, so a low equity number isn't always
  the best offer.
  - S: 2.6x or more (the right Shark, and you negotiated)
  - A: 1.9x
  - B: 1.3x
  - C: 0.9x (usually walking away)
  - D: below that (you gave away too much)
- The results card shows your deal, company value, your stake, questions
  nailed, how many Sharks went out, the grade and a title such as
  "Retail Rocket" or "Walked Away Wiser". Your best grade is saved locally.
  `A Play again` starts a new run.

---

## 3. The Sharks

| Shark | Title | Loves | Rewards | Deal style | Patience |
|---|---|---|---|---|---|
| Rex Hammer | The Retail King | Home, Food | Bold | Equity | 2 |
| Mr. Goldfin | The Royalty Man | Numbers | Honest, hates dodging | Royalty | 1 |
| Coral Vance | Queen of Home Shopping | Home, Pets | Honest | Equity | 2 |
| Tiger Mako | The Tech Maverick | Pets / tech | Bold | More cash, more equity | 1 |
| Nova Reyes | The Clean-Label Investor | Food | Honest | Loan plus equity | 3 |

All names and characters are original.

---

## 4. Controls

| Input | Action |
|---|---|
| `Enter`, `Space`, `A`, or a click | Continue, confirm |
| Left and right arrows | Browse products, move sliders |
| Up and down arrows | Move between choices |
| `1` to `4` | Pick an answer directly |
| `M` | Mute |

It works with touch too: every choice is a tappable button and the stage
scales to any screen. In portrait, the dialog sits under the stage instead
of over it.

---

## 5. Code structure

```
shark-tank.html               Vite entry (the Quran quiz stays on index.html)
src/shark-tank/
  main.tsx                    mount point
  App.tsx                     stage, HUD and phase router
  game.ts                     state, reducer and all game rules (seeded RNG)
  data.ts                     Sharks, products, openers, questions
  sfx.ts                      tiny WebAudio blips
  pixel/sprites.ts            string-map pixel sprites and palettes
  pixel/scenes.ts             canvas scene painters (title, workshop, hallway, tank)
  components/PixelStage.tsx   canvas and animation loop
  components/ui.tsx           Bubble, Pill, Dial, Card, Plate, Meter
  shark-tank.css              HUD styling
```
