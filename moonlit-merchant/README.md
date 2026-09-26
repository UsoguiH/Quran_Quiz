# Moonlit Merchant 3D

A first-person 3D take on the *Moonlighter* gameplay loop: shopkeeper by day, dungeon crawler by night.
The UI borrows Minecraft's layout (hotbar, slot grids, hearts and armor rows, beveled buttons, chat-style
messages, F3 debug screen) but is drawn smooth and rounded instead of pixelated. The world is rendered with a
"shader pack" style pipeline.

## Play the preview

**https://claude.ai/artifact/GTLQWvSyBSa3hRGkJB7CSg**: works on desktop and on phones. On a phone, turn it sideways.

## Mobile controls

| Control | Action |
| --- | --- |
| Left side of the screen | Floating joystick (touch anywhere to move) |
| Right side of the screen | Swipe to look around |
| ⚔️ | Attack (hold to draw the bow) |
| 🛡️ / 💨 | Block / dodge roll |
| ✋ or tap the prompt | Interact / pick up |
| 🔄 ❤️ 🌙 | Swap weapon · quick heal · hold for the Merchant Pendant |
| 🎒 📖 ⏸ | Inventory · ledger · pause |
| Hotbar | Tap a slot to select it, tap it again to use it |
| Inventory | Tap to pick up/place, long-press to split a stack |

## Run it

```bash
cd moonlit-merchant
npm install
npm run dev      # open the printed URL
npm run build    # production build in dist/
```

## Gameplay loop

1. **Shop (day, 07:00 – 19:00)**: Put loot on display tables with `E` and set a price per item. Open the shop at
   the register. Customers browse and react:
   😍 too cheap · 🙂 perfect · 😓 pricey (may still buy) · 😠 won't buy. Serve buyers at the register (`E`).
   Every reaction is recorded in your **ledger** (`L`). Selling a lot of one item lowers its demand for a few days,
   and each day brings a random "craze" item that sells for more.
2. **Hollow Ruins (any time)**: The gate is south of the plaza. The dungeon has 3 procedurally generated floors
   with locked combat rooms, treasure rooms, a healing Moonwell, breakable pots and a stairs portal. The
   **Hollow Colossus** boss waits on floor 3.
   - Hold `R` for the **Merchant Pendant** to teleport home with your loot (costs gold).
   - If you die, you lose everything except your **pocket row** (the gold-bordered top row of the bag).
3. **Village**: Brom the smith forges swords, greatswords, bows and armor. Mirelle brews potions. Tomo upgrades
   your shop (more tables, rug, chandelier, bigger bag, cheaper pendant). Sleep in your bed to skip to morning
   and save.

## Controls

| Key | Action |
| --- | --- |
| WASD + mouse | Move / look |
| E | Interact / pick up |
| Tab / I | Inventory (click = pick up, right-click = split, shift-click = quick move) |
| LMB | Attack (3-hit sword combo, hold to draw a bow) |
| RMB | Raise shield / block |
| Space | Dodge roll (invulnerable while rolling) |
| Q | Swap weapon |
| 1–5 / wheel | Select pocket slot · F uses it · H quick-heal |
| R (hold) | Merchant Pendant |
| L | Price ledger |
| F3 | Debug overlay |
| Esc | Pause / settings (graphics quality, FOV, sensitivity, volume) |

## Rendering ("shaders")

- HDR pipeline: GTAO ambient occlusion → bloom → custom grading pass (screen-space god rays, ACES tone
  mapping, split toning, vignette, chromatic aberration, grain) → FXAA
- Dynamic day/night sky shader with sun, moon, stars, milky way and drifting clouds. Soft PCF shadows follow the
  sun, and sunlight shines through the shop windows.
- Wind-animated instanced grass and foliage, stylised water with fresnel and sun glints, swirling portals,
  volumetric moonbeam shafts, flickering torches with a pooled light system, and GPU particles
- Procedural smooth textures (stone, cobble, wood, plaster, roof tiles, grass) with generated normal maps.
  No image assets, and all audio is synthesised with WebAudio.
- Quality presets: Low / Medium / High / Ultra

## Code map

```
src/main.js            game loop, flow (areas, day cycle, death, pendant)
src/render/            engine & post-processing, sky, textures, models, shaders, particles
src/world/             Village, ShopInterior, Dungeon (generator + builder), collision
src/entities/          player controller, weapons/viewmodel, enemies & boss, projectiles, loot
src/game/              items/recipes, save state & containers, shop + customer AI
src/ui/                HUD, windows, icons, styles
```
