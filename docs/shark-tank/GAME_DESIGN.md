# Shark Tank: The Pitch (game design)

A short, replayable pitch game in cozy pixel art. You play a founder who walks
into the Tank, wins over five investors ("Sharks") across four action rounds
and haggles for a deal. The camera is first person the whole way, and the
story is told through animated cutscenes rather than dialog boxes.

A full run takes 5 to 7 minutes. The product you pick, your ask and how well
you play each round change the result.

---

## 1. Visual direction

The look follows the warm top-down pixel style of the reference screenshots,
rebuilt for a first-person camera.

| Element | Reference cue | In this game |
|---|---|---|
| Palette | Warm woods, olive and gold grass, one saturated teal | Walnut floors and panels, gold lamp light, teal banners and accents, deep blue-teal "tank" water behind the Sharks |
| Banners | Big teal cloth banner with scalloped edge and cream emblem | Hangs over the Sharks' chairs with a cream fin emblem; smaller ones in the hallway |
| Doors and light | Red double door with a warm light path on the ground | The Tank doors at the end of the hallway throw a light path toward the camera |
| Speech bubbles | Round cream bubbles with pixel faces or numbers (`126`, `2221`) | Shark reactions (faces), incoming questions (`!`), offers (`$150K / 16%`), exits (`I'm out`) |
| Button prompt | Dark round `A` badge beside a pale pill (`A Enter`) | Every action button: Pitch!, Toss, Hold to haggle, Hold to skip |
| Bottom dial | Cream half-dial with small triangles and a teal orb | Sits on the grilling card; its triangles light up as questions are resolved |
| Signposts | Small orange wooden sign with an icon | Shark name plates under each chair |
| Bunting | Rope with small teal flags across the top | Strung across the workshop and hallway ceilings |

Rendering: every scene is drawn on a 384 x 216 canvas and scaled up with
nearest-neighbour filtering. Cutscenes paint the same scenes into a buffer and
zoom it, so camera moves stay chunky and pixel-true. The HUD is HTML laid over
the canvas and sized in the same art-pixel unit. The only font is Pixelify Sans.

There is no dialog in the game. Sharks speak through face bubbles, offer
bubbles and arcade pop-ups ("Perfect!", "Nailed it!", "Too greedy!").
Cutscenes use short title cards, never text boxes.

---

## 2. Full flow

```
Title ─▶ [Cutscene: 2:14 AM] ─▶ Workshop (pick product) ─▶ Ledger (set your ask)
                                                                 │
          ┌──────────────────────────────────────────────────────┘
          ▼
[Cutscene: the walk-in] ─▶ Round 1 Pitch ─▶ Round 2 Demo ─▶ Round 3 Grilling
                                                                 │
          ┌──────────────── Offers reveal ◀──────────────────────┘
          ▼
   Round 4 Haggle ─┬─▶ [Cutscene: handshake] ─┐
                   └─▶ [Cutscene: no deal] ───┴─▶ [Cutscene: 6 months later] ─▶ Results ─▶ Play again
```

Every cutscene is letterboxed and can be skipped by holding A (or holding the
skip pill). Every round opens with a "Round N" stinger that tap or A skips.

### 2.1 Title
Exterior of the studio in afternoon light: wooden hall, giant teal banner,
red door, light path on the grass, wheat, an autumn tree. Logo, best grade
from earlier runs (saved on the device), `A Start`.

### 2.2 Cutscene: 2:14 AM (about 8 s)
1. Close-up of the workbench at night, sparks flying off a prototype.
   Title card "2:14 AM".
2. The camera pulls back to the whole garage. A teal envelope flies in
   through the window and lands on the bench.
3. The invitation fills the frame: fin emblem, wax seal, "You're invited:
   Pitch the Sharks. Tomorrow, 9 AM, the Tank."

### 2.3 Workshop and ledger (no change from v1)
- Three prototypes on stands with price bubbles. Browse with left/right or a
  click, `A` to choose. A card shows 12-month sales, growth, cost and price,
  margin and patent.
- Two sliders set the ask. The implied valuation and a Shark-o-meter
  (bargain, fair, spicy, greedy) update live. A greedy ask makes every Shark
  start colder and makes Numbers questions tougher in Round 3.

| Product | Category | Price / cost | 12-mo sales | Growth | Numbers | Proof | Story |
|---|---|---|---|---|---|---|---|
| Glow Jar | Home | $39 / $9 | $186K | 12%/mo | Solid | Weak | Strong |
| Pup Pod | Pets / tech | $129 / $71 | $420K | 4%/mo | Solid | Strong | Solid |
| Kelp Crunch | Food | $4 / $1.60 | $92K | 22%/mo | Weak | Weak | Strong |

### 2.4 Cutscene: the walk-in (about 11 s)
1. First-person dolly down the hallway toward the red doors, with head bob.
   Title card "The next morning".
2. The doors swing open and the frame floods with light.
3. The Tank fades in under a "The Tank" stamp.
4. The camera pans across the five Sharks one by one. Each gets a
   fighting-game style name card that slides in with their title.
5. Pull back to the full room.

### 2.5 Round 1: The Pitch (timing)
- Three beats: the Hook, the Product, the Ask.
- A marker swings across a meter with a teal "good" band and a narrow gold
  "perfect" band. Press A (or tap) to stop it. It swings faster each beat.
- Perfect: +7 interest for every Shark and +1 nerve. Good: +3. Miss: -4 and
  -1 nerve, with a screen shake.
- Higher nerve widens the gold band.

### 2.6 Round 2: The Demo (aim and toss)
- Five samples. Aim a reticle with the mouse, a finger or the arrow keys,
  then toss. The reticle wobbles more when your nerve is low.
- The sample arcs from your hand and shrinks with distance. A Shark who
  catches it holds it on their lap for the rest of the pitch.
- A first catch is worth +10 from a Shark who loves the category and +6
  otherwise. A repeat catch is worth +2. A miss costs everyone 1 point and
  leaves the sample on the floor.

### 2.7 Round 3: The Grilling (block the questions)
- Nine questions fly out of the Sharks' chairs toward the camera as icons:
  **$ Numbers**, **gear Proof**, **heart Story**. Each Shark leans toward
  certain types (Mr. Goldfin fires Numbers, Tiger fires Proof, Nova fires
  Story).
- Block the question closest to you with the matching card (1, 2, 3 or a tap).
- A weak spot for your product shows up as an armored question with a red
  ring, and it needs two blocks. The cards show which types are weak.
- Questions get faster and closer together. Up to two can be in the air.
- Nailed: +7 to +10 for the Shark who asked, +1 for the others, +1 nerve.
  Wrong card: -5 and -1 nerve. It hits you: -9 for that Shark, -2 for the
  others, -1 nerve and a screen shake.
- A Shark whose interest drops below 22 goes out: their chair dims and an
  "I'm out" bubble appears.

### 2.8 Offers reveal
The Sharks answer one at a time. Each either drops an offer bubble or goes
out. A stamp announces "3 offers!" or "No offers". Deal styles:

| Shark | Title | Loves | Fires | Deal style | Patience |
|---|---|---|---|---|---|
| Rex Hammer | The Retail King | Home, Food | Numbers | Straight equity | 2 |
| Mr. Goldfin | The Royalty Man | (numbers) | Numbers | Less equity + $1/unit royalty | 1 |
| Coral Vance | Queen of Home Shopping | Home, Pets | Story | Straight equity | 2 |
| Tiger Mako | The Tech Maverick | Pets | Proof | 25% more cash for more equity | 1 |
| Nova Reyes | The Clean-Label Investor | Food | Story | Half the cash as a loan | 3 |

### 2.9 Round 4: The Haggle (tug-of-war)
- Pick an offer by tapping its bubble or chip (or pressing 1 to 5).
- **Hold A** to drag the equity marker down toward your original ask.
  The Shark's **temper** bar fills while you hold and cools when you let go.
- Every Shark has a hidden floor. Below it, temper climbs about four times
  faster, the Shark sweats and the bar flashes red. That's your cue.
- **Shake** (Enter) locks the deal at the current number. Shaking below the
  floor gets "No way.": temper +30 and the number bounces back up.
- At 100 temper the Shark walks. The others cool by 4, and anyone who drops
  below 50 pulls their offer too.
- Walk away (with a confirm) to leave with no deal.

### 2.10 Cutscene: handshake or walk-out
- Deal (about 5 s): first-person handshake. Your mustard sleeve comes in
  from the bottom left and the Shark's suit sleeve from the top right. The
  hands clasp and shake, confetti falls and a "Deal!" stamp slams down. Then
  the camera zooms in on your new partner with the terms.
- No deal (about 3.5 s): the doors swing shut and the hallway dims under a
  red "No deal" stamp.

### 2.11 Cutscene: 6 months later, then results
1. Title card "6 months later".
2. With a deal: store shelves fill up with your product under "Rex's
   network, 9,558 units sold". Without one: a garage laptop with an order
   counter racing up ("the episode aired anyway").
3. The workshop in daylight, boxes stacking up in proportion to how well it
   went.
4. Results card: grade, title, deal terms, your stake, company value, perfect
   beats, samples caught, questions blocked and Sharks out.

### 2.12 Scoring
- Six-month revenue = half the yearly sales x growth x the Shark's boost x
  buzz. Rex boosts home and food, Coral boosts home and pets, Tiger boosts
  pets, Nova boosts food, and Mr. Goldfin gives a flat boost. With no deal
  you still get a small on-air bump (x1.15).
- Buzz = +1.2% per performance point. A perfect beat is 2 points, a good beat
  1, and each catch and each blocked question 1.
- Score = the value of the stake you still own, compared with what the
  company would have been worth in six months without the show. Loans are
  debt and royalties come off the top.
  - S: 2.6x or more
  - A: 1.9x
  - B: 1.3x
  - C: 0.9x (usually walking away)
  - D: below that

---

## 3. Controls

| Input | Action |
|---|---|
| `A`, `Space` or `Enter` | Pitch, toss, start, skip a round stinger |
| Hold `A` / `Space` | Haggle; skip a cutscene |
| `Enter` | Shake hands (haggle) |
| Arrows or mouse / touch | Aim samples; browse products |
| `1` `2` `3` | Numbers, Proof and Story cards |
| `1` to `5` | Pick an offer to haggle |
| `M` | Mute |

Touch works everywhere: tap to aim and release to toss, tap cards, and press
and hold the haggle button. In portrait, the stage sits on top and the round
controls dock underneath.

---

## 4. Code structure

```
shark-tank.html                 Vite entry (the Quran quiz stays on index.html)
src/shark-tank/
  App.tsx                       phase router, HUD, reactions, pop-ups, shake
  game.ts                       state, reducer and scoring (seeded RNG)
  data.ts                       Sharks, products, question types
  sfx.ts                        tiny WebAudio cues
  components/stage.tsx          stage API: canvas effects, frame loop, panel portal, keys
  components/PixelStage.tsx     canvas loop (scene, then effects, then vignette)
  components/Cutscene.tsx       shot player, letterbox, hold-to-skip, caption pieces
  components/scripts.tsx        the five cutscenes
  components/panels.tsx         product picker, ask ledger, results
  components/ui.tsx             Bubble, A prompt, Dial, Plate, nerve meter
  rounds/Pitch.tsx              Round 1 timing meter
  rounds/Demo.tsx               Round 2 aim and toss
  rounds/Grill.tsx              Round 3 question blocking
  rounds/Haggle.tsx             offers reveal and Round 4 tug-of-war
  pixel/sprites.ts              string-map sprites and palettes
  pixel/scenes.ts               scene painters (title, workshop, hallway, tank)
  pixel/cutscenes.ts            zoom camera, handshake, letter, shelves, orders
  shark-tank.css                HUD styling
```
