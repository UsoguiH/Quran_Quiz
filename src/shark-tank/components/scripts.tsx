import { PRODUCTS, SHARKS, SHARK_ORDER, money, type SharkId } from '../data';
import type { GameState } from '../game';
import {
  boxes,
  clamp01,
  ease,
  envelope,
  fill,
  handshake,
  letter,
  lerp,
  orders,
  shelves,
  sparks,
  zoomed,
} from '../pixel/cutscenes';
import { SEATS, confetti, paintScene, type View } from '../pixel/scenes';
import { CountUp, NameCard, Stamp, TitleCard, type Shot } from './Cutscene';

type Base = Omit<View, 'doorStart'>;
const v = (base: Base, over: Partial<View> = {}): View => ({ ...base, doorStart: null, ...over });

/** Night before: tinkering in the garage, then the invitation arrives. */
export function introShots(base: Base): Shot[] {
  const shop = v(base, { scene: 'workshop', epilogue: false, focusOnly: false, selected: 'pup', hideCursor: true });
  return [
    {
      dur: 2600,
      sfx: 'blip',
      caption: <TitleCard big="2:14 AM" small="Your garage" />,
      draw: (c, k, t) => {
        zoomed(c, t, shop, 2.4, lerp(150, 220, ease(k)), 96, (b) => sparks(b, t, 192, 102));
      },
    },
    {
      dur: 2600,
      sfx: 'select',
      draw: (c, k, t) => {
        const z = lerp(2.4, 1, ease(clamp01(k / 0.45)));
        zoomed(c, t, shop, z, lerp(220, 192, ease(clamp01(k / 0.45))), lerp(96, 108, clamp01(k / 0.45)));
        if (k > 0.4) {
          const f = ease(clamp01((k - 0.4) / 0.5));
          const x = lerp(326, 192, f);
          const y = lerp(40, 112, f) - Math.sin(f * Math.PI) * 30;
          envelope(c, x, y, 2);
        }
      },
    },
    {
      dur: 3200,
      sfx: 'confirm',
      caption: (
        <div className="st-invite">
          <small>You're invited</small>
          <b>Pitch the Sharks</b>
          <span>Tomorrow · 9 AM · The Tank</span>
        </div>
      ),
      draw: (c, k, t) => {
        letter(c, t);
        if (k < 0.15) fill(c, '#0a0706', 1 - k / 0.15);
      },
    },
  ];
}

/** Down the hallway, through the doors, and a look at each Shark. */
export function walkinShots(base: Base): Shot[] {
  const hall = v(base, { scene: 'hallway' });
  const tank = v(base, { scene: 'tank', hand: 'none' });
  const zoomTo = (id: SharkId) => ({ x: SEATS[id].x, y: SEATS[id].top + 26 });
  const shots: Shot[] = [
    {
      dur: 2400,
      caption: <TitleCard big="The next morning" />,
      draw: (c, k, t) => {
        const bob = Math.sin(t / 170) * 1.5;
        zoomed(c, t, hall, lerp(1, 1.8, ease(k)), 192, 108 + bob);
      },
    },
    {
      dur: 1400,
      sfx: 'door',
      draw: (c, k, t, ms) => {
        zoomed(c, t, { ...hall, doorStart: t - ms }, 1.8, 192, 108);
        if (k > 0.55) fill(c, '#fff4c8', ease((k - 0.55) / 0.45));
      },
    },
    {
      dur: 1100,
      caption: <Stamp text="The Tank" tone="teal" />,
      draw: (c, k, t) => {
        zoomed(c, t, tank, lerp(1.25, 1, ease(k)), 192, 100);
        fill(c, '#fff4c8', 1 - ease(k));
      },
    },
  ];
  let prev = { x: 192, y: 100 };
  SHARK_ORDER.forEach((id, i) => {
    const from = prev;
    const to = zoomTo(id);
    prev = to;
    shots.push({
      dur: 1050,
      sfx: 'blip',
      caption: (
        <NameCard name={SHARKS[id].name} title={SHARKS[id].title} color={SHARKS[id].palette.c} side={i % 2 ? 'right' : 'left'} />
      ),
      draw: (c, k, t) => {
        const f = ease(clamp01(k / 0.35));
        zoomed(c, t, tank, i === 0 ? lerp(1, 2.6, f) : 2.6, lerp(from.x, to.x, f), lerp(from.y, to.y, f));
      },
    });
  });
  shots.push({
    dur: 900,
    draw: (c, k, t) => zoomed(c, t, tank, lerp(2.6, 1, ease(k)), lerp(prev.x, 192, ease(k)), lerp(prev.y, 108, ease(k))),
  });
  return shots;
}

/** First-person handshake, then your new partner up close. */
export function dealShots(base: Base, s: GameState): Shot[] {
  const deal = s.deal!;
  const tank = v(base, { scene: 'tank', hand: 'none', dealShark: deal.shark });
  const seat = SEATS[deal.shark];
  return [
    {
      dur: 2700,
      sfx: 'deal',
      caption: <Stamp text="Deal!" tone="gold" delay={900} />,
      draw: (c, k, t) => handshake(c, t, k, tank, deal.shark),
    },
    {
      dur: 2000,
      caption: (
        <TitleCard
          big={SHARKS[deal.shark].name}
          small={`${money(deal.amount)} for ${deal.equity}%${deal.royalty ? ' + royalty' : ''}${deal.loan ? ' (half loan)' : ''}`}
        />
      ),
      draw: (c, k, t) =>
        zoomed(c, t, tank, lerp(1.4, 2.4, ease(k)), seat.x, seat.top + 26, (b) => confetti(b, t, false)),
    },
  ];
}

/** The doors close behind you. */
export function noDealShots(base: Base): Shot[] {
  const hall = v(base, { scene: 'hallway' });
  return [
    {
      dur: 2600,
      sfx: 'out',
      caption: <Stamp text="No deal" tone="red" delay={400} />,
      draw: (c, k, t) => {
        // run the door animation backwards: fully open at k=0, shut at k=1
        const openFor = 1200 * (1 - ease(clamp01(k / 0.7)));
        zoomed(c, t, { ...hall, doorStart: t - openFor }, lerp(1.6, 1.2, k), 192, 110);
        fill(c, '#0a0706', k * 0.45);
      },
    },
    {
      dur: 900,
      draw: (c, k, t) => {
        paintScene(c, t, hall);
        fill(c, '#0a0706', 0.45 + k * 0.55);
      },
    },
  ];
}

/** Six months later: shelves or orders, then boxes piling up in the garage. */
export function laterShots(base: Base, s: GameState): Shot[] {
  const r = s.result!;
  const p = PRODUCTS[s.product];
  const units = Math.round(r.revenue6 / p.price);
  const pile = Math.round(Math.min(14, r.ratio * 4));
  return [
    {
      dur: 1700,
      caption: <TitleCard big="6 months later" />,
      draw: (c) => fill(c, '#0a0706'),
    },
    s.deal
      ? {
          dur: 2800,
          sfx: 'good',
          caption: (
            <TitleCard big={`${SHARKS[s.deal.shark].short}'s network`} small={`${units.toLocaleString('en-US')} units sold`} />
          ),
          draw: (c, k, t) => shelves(c, t, k, s.product),
        }
      : {
          dur: 2800,
          sfx: 'good',
          caption: (
            <div className="st-titlecard">
              <b>
                <CountUp to={units} ms={2200} /> orders
              </b>
              <span>The episode aired anyway</span>
            </div>
          ),
          draw: (c, k) => orders(c, k),
        },
    {
      dur: 2400,
      sfx: pile > 6 ? 'deal' : 'blip',
      draw: (c, k, t) => boxes(c, t, k, v(base, { dealShark: s.deal?.shark ?? null }), pile),
    },
  ];
}
