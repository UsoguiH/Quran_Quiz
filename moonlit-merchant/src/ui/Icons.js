import * as THREE from 'three';

// Smooth vector-style item icons painted on canvas (no pixel art).
const SIZE = 128;
const cache = new Map();

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  ctx.scale(SIZE / 64, SIZE / 64); // draw in a 64x64 coordinate space
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return [c, ctx];
}

function radial(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function shine(ctx, x, y, rx, ry, a = 0.55) {
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function outline(ctx, w = 2.2, color = 'rgba(20,14,30,0.85)') {
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function glow(ctx, color, blur = 10) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

const painters = {
  gel(ctx) {
    ctx.beginPath();
    ctx.moveTo(10, 46);
    ctx.bezierCurveTo(8, 30, 20, 14, 32, 12);
    ctx.bezierCurveTo(46, 14, 56, 30, 54, 46);
    ctx.bezierCurveTo(52, 54, 12, 54, 10, 46);
    ctx.fillStyle = radial(ctx, 32, 34, 26, [
      [0, '#eaffc9'],
      [0.4, '#7cf06a'],
      [1, '#1f8f4a'],
    ]);
    glow(ctx, 'rgba(120,255,120,0.6)', 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    shine(ctx, 23, 26, 6, 3.5);
    ctx.fillStyle = 'rgba(20,80,40,0.35)';
    [
      [36, 38, 3],
      [26, 42, 2],
      [42, 30, 2],
    ].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  twig(ctx) {
    ctx.strokeStyle = linear(ctx, 10, 54, 54, 10, [
      [0, '#6b4424'],
      [1, '#a8764a'],
    ]);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(12, 54);
    ctx.quadraticCurveTo(28, 36, 50, 12);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, 34);
    ctx.quadraticCurveTo(40, 34, 48, 40);
    ctx.stroke();
    const leaf = (x, y, rot, c) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      outline(ctx, 1.6);
      ctx.restore();
    };
    leaf(50, 42, 0.6, '#8fdc6a');
    leaf(44, 16, -0.8, '#6cc454');
    leaf(22, 42, -2.2, '#9be27c');
  },
  bone(ctx) {
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(-0.7);
    ctx.fillStyle = linear(ctx, 0, -8, 0, 8, [
      [0, '#fffaf0'],
      [1, '#d9ccb0'],
    ]);
    ctx.beginPath();
    ctx.roundRect(-18, -5, 36, 10, 4);
    [
      [-20, -5],
      [-20, 5],
      [20, -5],
      [20, 5],
    ].forEach(([x, y]) => {
      ctx.moveTo(x + 7, y);
      ctx.arc(x, y, 7, 0, Math.PI * 2);
    });
    ctx.fill();
    outline(ctx);
    ctx.restore();
    shine(ctx, 22, 24, 5, 2, 0.5);
  },
  iron(ctx) {
    ctx.beginPath();
    ctx.moveTo(14, 40);
    ctx.lineTo(20, 20);
    ctx.lineTo(38, 12);
    ctx.lineTo(52, 24);
    ctx.lineTo(50, 44);
    ctx.lineTo(32, 54);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 14, 12, 52, 54, [
      [0, '#d6dae0'],
      [0.5, '#8a929c'],
      [1, '#4d535c'],
    ]);
    ctx.fill();
    outline(ctx);
    ctx.fillStyle = 'rgba(190,90,40,0.75)';
    [
      [36, 40, 5],
      [24, 30, 3],
      [44, 26, 2.5],
    ].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(21, 22);
    ctx.lineTo(37, 15);
    ctx.stroke();
  },
  fabric(ctx) {
    ctx.beginPath();
    ctx.moveTo(10, 18);
    ctx.bezierCurveTo(24, 10, 40, 22, 54, 14);
    ctx.lineTo(52, 44);
    ctx.bezierCurveTo(40, 52, 24, 40, 12, 50);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 10, 14, 54, 50, [
      [0, '#d59bff'],
      [0.5, '#8d4ed8'],
      [1, '#51208e'],
    ]);
    ctx.fill();
    outline(ctx);
    ctx.strokeStyle = 'rgba(255,215,120,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 44);
    ctx.bezierCurveTo(24, 36, 40, 46, 50, 38);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(14, 22);
    ctx.bezierCurveTo(26, 16, 38, 26, 50, 20);
    ctx.stroke();
  },
  amber(ctx) {
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.bezierCurveTo(44, 24, 52, 32, 50, 42);
    ctx.bezierCurveTo(48, 54, 16, 54, 14, 42);
    ctx.bezierCurveTo(12, 32, 22, 22, 32, 8);
    ctx.fillStyle = radial(ctx, 32, 38, 22, [
      [0, '#fff1a8'],
      [0.45, '#ffb62e'],
      [1, '#b0560a'],
    ]);
    glow(ctx, 'rgba(255,170,40,0.7)', 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    ctx.fillStyle = 'rgba(90,40,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(34, 40, 4, 2, 0.5, 0, Math.PI * 2);
    ctx.fill();
    shine(ctx, 25, 32, 4, 7, 0.55);
  },
  scroll(ctx) {
    ctx.fillStyle = linear(ctx, 0, 14, 0, 50, [
      [0, '#fff2d0'],
      [1, '#d9b77a'],
    ]);
    ctx.beginPath();
    ctx.roundRect(14, 16, 36, 32, 3);
    ctx.fill();
    outline(ctx);
    ['#c2955a', '#c2955a'].forEach((c, i) => {
      const y = i ? 48 : 16;
      ctx.beginPath();
      ctx.roundRect(10, y - 4, 44, 8, 4);
      ctx.fillStyle = linear(ctx, 0, y - 4, 0, y + 4, [
        [0, '#e8c48a'],
        [1, '#9a6a34'],
      ]);
      ctx.fill();
      outline(ctx, 1.8);
    });
    ctx.strokeStyle = 'rgba(90,60,30,0.6)';
    ctx.lineWidth = 1.8;
    [25, 31, 37].forEach((y, i) => {
      ctx.beginPath();
      ctx.moveTo(19, y);
      ctx.lineTo(45 - i * 6, y);
      ctx.stroke();
    });
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(40, 40, 3.5, 0, Math.PI * 2);
    ctx.fill();
  },
  crystal(ctx) {
    const facets = [
      [
        [32, 6],
        [46, 22],
        [32, 58],
      ],
      [
        [32, 6],
        [18, 22],
        [32, 58],
      ],
      [
        [18, 22],
        [10, 34],
        [32, 58],
      ],
      [
        [46, 22],
        [54, 34],
        [32, 58],
      ],
    ];
    const cols = ['#9fe8ff', '#4fb8f0', '#2a7fd0', '#6fd0ff'];
    glow(ctx, 'rgba(90,200,255,0.8)', 12);
    facets.forEach((f, i) => {
      ctx.beginPath();
      ctx.moveTo(...f[0]);
      ctx.lineTo(...f[1]);
      ctx.lineTo(...f[2]);
      ctx.closePath();
      ctx.fillStyle = cols[i];
      ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(32, 6);
    ctx.lineTo(46, 22);
    ctx.lineTo(54, 34);
    ctx.lineTo(32, 58);
    ctx.lineTo(10, 34);
    ctx.lineTo(18, 22);
    ctx.closePath();
    outline(ctx);
    shine(ctx, 27, 20, 3, 6, 0.6);
  },
  feather(ctx) {
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(0.6);
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.bezierCurveTo(14, -14, 12, 10, 0, 22);
    ctx.bezierCurveTo(-12, 10, -14, -14, 0, -26);
    ctx.fillStyle = linear(ctx, 0, -26, 0, 22, [
      [0, '#fff08a'],
      [0.4, '#ff8a2a'],
      [1, '#c0241a'],
    ]);
    glow(ctx, 'rgba(255,120,40,0.8)', 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    ctx.strokeStyle = 'rgba(120,20,10,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 30);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let i = -16; i < 16; i += 6) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(7, i - 5);
      ctx.stroke();
    }
    ctx.restore();
  },
  gear(ctx) {
    ctx.save();
    ctx.translate(32, 32);
    ctx.beginPath();
    const teeth = 10;
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const r = i % 2 ? 19 : 25;
      const a2 = a + Math.PI / (teeth * 2);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
    }
    ctx.closePath();
    ctx.fillStyle = radial(ctx, 0, 0, 26, [
      [0, '#ffe3a0'],
      [0.6, '#d69a3a'],
      [1, '#7a4c14'],
    ]);
    ctx.fill();
    outline(ctx);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#3a2a1a';
    ctx.fill();
    outline(ctx, 1.8);
    ctx.restore();
    shine(ctx, 24, 22, 6, 3, 0.45);
  },
  wisp(ctx) {
    ctx.beginPath();
    ctx.roundRect(26, 6, 12, 8, 2);
    ctx.fillStyle = '#9a6a3a';
    ctx.fill();
    outline(ctx, 1.8);
    ctx.beginPath();
    ctx.moveTo(27, 14);
    ctx.lineTo(27, 20);
    ctx.bezierCurveTo(12, 26, 10, 52, 32, 56);
    ctx.bezierCurveTo(54, 52, 52, 26, 37, 20);
    ctx.lineTo(37, 14);
    ctx.closePath();
    ctx.fillStyle = 'rgba(190,220,255,0.35)';
    ctx.fill();
    outline(ctx);
    glow(ctx, 'rgba(140,220,255,1)', 16);
    ctx.fillStyle = radial(ctx, 32, 40, 11, [
      [0, '#ffffff'],
      [0.4, '#bdf3ff'],
      [1, 'rgba(80,180,255,0)'],
    ]);
    ctx.beginPath();
    ctx.arc(32, 40, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    shine(ctx, 22, 34, 3, 7, 0.4);
  },
  core(ctx) {
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fillStyle = radial(ctx, 32, 32, 24, [
      [0, '#9a9aa6'],
      [1, '#454552'],
    ]);
    ctx.fill();
    outline(ctx);
    glow(ctx, 'rgba(255,140,40,1)', 16);
    ctx.beginPath();
    ctx.arc(32, 32, 12, 0, Math.PI * 2);
    ctx.fillStyle = radial(ctx, 32, 32, 12, [
      [0, '#fff4c0'],
      [0.5, '#ff9a2a'],
      [1, '#c2410c'],
    ]);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,160,60,0.9)';
    ctx.lineWidth = 2;
    [0, 1.6, 3.4, 4.8].forEach((a) => {
      ctx.beginPath();
      ctx.moveTo(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13);
      ctx.lineTo(32 + Math.cos(a + 0.2) * 22, 32 + Math.sin(a + 0.2) * 22);
      ctx.stroke();
    });
  },
  rune(ctx) {
    ctx.beginPath();
    ctx.roundRect(14, 8, 36, 48, 8);
    ctx.fillStyle = linear(ctx, 14, 8, 50, 56, [
      [0, '#fff3b0'],
      [0.5, '#f2b632'],
      [1, '#a0600a'],
    ]);
    glow(ctx, 'rgba(255,200,60,0.8)', 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    ctx.strokeStyle = '#7a3e00';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(32, 16);
    ctx.lineTo(32, 48);
    ctx.moveTo(22, 24);
    ctx.lineTo(42, 40);
    ctx.moveTo(42, 24);
    ctx.lineTo(22, 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(32, 32, 6, 0, Math.PI * 2);
    ctx.stroke();
    shine(ctx, 22, 16, 5, 2.5, 0.6);
  },
  pearl(ctx) {
    glow(ctx, 'rgba(200,180,255,0.9)', 16);
    ctx.beginPath();
    ctx.arc(32, 32, 20, 0, Math.PI * 2);
    ctx.fillStyle = radial(ctx, 32, 32, 20, [
      [0, '#ffffff'],
      [0.5, '#e6dcff'],
      [1, '#8f7fd0'],
    ]);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    ctx.fillStyle = 'rgba(160,220,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(38, 38, 9, 6, -0.6, 0, Math.PI * 2);
    ctx.fill();
    shine(ctx, 25, 24, 7, 4, 0.8);
  },
  heart(ctx) {
    ctx.beginPath();
    ctx.moveTo(32, 54);
    ctx.bezierCurveTo(4, 34, 10, 8, 32, 20);
    ctx.bezierCurveTo(54, 8, 60, 34, 32, 54);
    ctx.fillStyle = radial(ctx, 32, 30, 26, [
      [0, '#8e8a98'],
      [1, '#3a3844'],
    ]);
    ctx.fill();
    outline(ctx);
    glow(ctx, 'rgba(255,60,90,1)', 12);
    ctx.strokeStyle = '#ff4a6a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(32, 22);
    ctx.lineTo(28, 32);
    ctx.lineTo(35, 36);
    ctx.lineTo(30, 46);
    ctx.moveTo(20, 24);
    ctx.lineTo(24, 32);
    ctx.moveTo(44, 24);
    ctx.lineTo(40, 34);
    ctx.stroke();
    ctx.shadowBlur = 0;
  },
  crown(ctx) {
    ctx.beginPath();
    ctx.moveTo(10, 46);
    ctx.lineTo(8, 18);
    ctx.lineTo(21, 30);
    ctx.lineTo(32, 12);
    ctx.lineTo(43, 30);
    ctx.lineTo(56, 18);
    ctx.lineTo(54, 46);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, 12, 0, 50, [
      [0, '#fff3a8'],
      [0.5, '#f4b83a'],
      [1, '#a0600a'],
    ]);
    glow(ctx, 'rgba(255,200,80,0.7)', 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    ctx.beginPath();
    ctx.roundRect(9, 44, 46, 9, 3);
    ctx.fillStyle = '#c98a1e';
    ctx.fill();
    outline(ctx, 1.8);
    [
      ['#ff4a6a', 20],
      ['#58d1ff', 32],
      ['#7ee07a', 44],
    ].forEach(([c, x]) => {
      ctx.beginPath();
      ctx.arc(x, 48.5, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    });
    shine(ctx, 20, 26, 3, 6, 0.5);
  },
  potion_s(ctx) {
    potion(ctx, '#ff5a6e', '#a0102a', 17);
  },
  potion_l(ctx) {
    potion(ctx, '#c28bff', '#4a1a9a', 21, true);
  },
  sword(ctx, tier = 1) {
    const blade = [
      ['#f4d9b0', '#b87a3a'],
      ['#dff6ff', '#4fb8f0'],
      ['#f3eeff', '#9f86ff'],
    ][tier - 1];
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-4, -20);
    ctx.lineTo(0, -28);
    ctx.lineTo(4, -20);
    ctx.lineTo(4, 8);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, -4, 0, 4, 0, [
      [0, blade[0]],
      [1, blade[1]],
    ]);
    if (tier > 1) glow(ctx, blade[1], 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    ctx.beginPath();
    ctx.roundRect(-12, 7, 24, 5, 2.5);
    ctx.fillStyle = '#e0a93a';
    ctx.fill();
    outline(ctx, 1.8);
    ctx.beginPath();
    ctx.roundRect(-2.5, 12, 5, 12, 2);
    ctx.fillStyle = '#6a3c1c';
    ctx.fill();
    outline(ctx, 1.8);
    ctx.beginPath();
    ctx.arc(0, 26, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e0a93a';
    ctx.fill();
    outline(ctx, 1.6);
    ctx.restore();
  },
  great(ctx, tier = 1) {
    const blade = [
      ['#d6dae0', '#6d747e'],
      ['#fff3b0', '#d69a2a'],
      ['#ffd0c0', '#c03a2a'],
    ][tier - 1];
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-7, 6);
    ctx.lineTo(-7, -20);
    ctx.lineTo(0, -29);
    ctx.lineTo(7, -20);
    ctx.lineTo(7, 6);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, -7, 0, 7, 0, [
      [0, blade[0]],
      [1, blade[1]],
    ]);
    if (tier > 1) glow(ctx, blade[1], 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    ctx.beginPath();
    ctx.roundRect(-14, 5, 28, 6, 3);
    ctx.fillStyle = '#5a5f6a';
    ctx.fill();
    outline(ctx, 1.8);
    ctx.beginPath();
    ctx.roundRect(-3, 11, 6, 15, 2);
    ctx.fillStyle = '#4a2a14';
    ctx.fill();
    outline(ctx, 1.8);
    ctx.restore();
  },
  bow(ctx, tier = 1) {
    const col = ['#a8703a', '#6fd0ff', '#ffb040'][tier - 1];
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.arc(-6, 0, 24, -1.2, 1.2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(20,14,30,0.85)';
    ctx.stroke();
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = col;
    if (tier > 1) glow(ctx, col, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-6 + Math.cos(-1.2) * 24, Math.sin(-1.2) * 24);
    ctx.lineTo(-6 + Math.cos(1.2) * 24, Math.sin(1.2) * 24);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#f5f0e6';
    ctx.stroke();
    ctx.restore();
  },
  armor(ctx, tier = 1) {
    const cols = [
      ['#c8a27a', '#7a5a3a'],
      ['#d6dae0', '#5d646e'],
      ['#bdf3ff', '#2a7fd0'],
      ['#efe6ff', '#7a5ad8'],
    ][tier];
    ctx.beginPath();
    ctx.moveTo(18, 10);
    ctx.lineTo(26, 14);
    ctx.quadraticCurveTo(32, 20, 38, 14);
    ctx.lineTo(46, 10);
    ctx.lineTo(56, 20);
    ctx.lineTo(50, 28);
    ctx.lineTo(48, 26);
    ctx.lineTo(48, 54);
    ctx.lineTo(16, 54);
    ctx.lineTo(16, 26);
    ctx.lineTo(14, 28);
    ctx.lineTo(8, 20);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 8, 10, 56, 54, [
      [0, cols[0]],
      [1, cols[1]],
    ]);
    if (tier > 1) glow(ctx, cols[1], 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, 22);
    ctx.lineTo(32, 52);
    ctx.stroke();
    shine(ctx, 23, 26, 3, 7, 0.4);
  },
  coin(ctx) {
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.fillStyle = radial(ctx, 32, 32, 22, [
      [0, '#fff6c4'],
      [0.5, '#ffd35a'],
      [1, '#c07a0a'],
    ]);
    ctx.fill();
    outline(ctx);
    ctx.beginPath();
    ctx.arc(32, 32, 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(140,80,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '900 18px Nunito, sans-serif';
    ctx.fillStyle = '#9a5a00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☾', 32, 33);
  },
  empty_weapon(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(18, 46);
    ctx.lineTo(46, 18);
    ctx.stroke();
  },
};

function potion(ctx, light, dark, r, big) {
  ctx.beginPath();
  ctx.roundRect(27, 6, 10, 9, 2);
  ctx.fillStyle = '#9a6a3a';
  ctx.fill();
  outline(ctx, 1.8);
  ctx.beginPath();
  ctx.moveTo(28, 15);
  ctx.lineTo(28, 22);
  ctx.arc(32, 22 + r, r, -Math.PI / 2 - 0.3, Math.PI * 1.5 + 0.3);
  ctx.lineTo(36, 15);
  ctx.closePath();
  ctx.fillStyle = 'rgba(220,235,255,0.35)';
  ctx.fill();
  outline(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.arc(32, 22 + r, r - 2.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = radial(ctx, 32, 26 + r, r, [
    [0, light],
    [1, dark],
  ]);
  glow(ctx, light, 10);
  ctx.fillRect(0, 22 + r * 0.55, 64, 64);
  ctx.restore();
  if (big) {
    ctx.fillStyle = 'rgba(255,230,140,0.9)';
    [
      [26, 42],
      [38, 48],
      [33, 38],
    ].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  shine(ctx, 25, 22 + r * 0.8, 3, 6, 0.55);
}

function paint(id) {
  const [c, ctx] = canvas();
  const m = /^(sword|great|bow)_(\d)$/.exec(id);
  const a = /^armor_(\d)$/.exec(id);
  if (m) painters[m[1]](ctx, +m[2]);
  else if (a) painters.armor(ctx, +a[1]);
  else if (painters[id]) painters[id](ctx);
  else {
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(32, 32, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export function iconCanvas(id) {
  if (!cache.has(id)) {
    const c = paint(id);
    cache.set(id, { canvas: c, url: c.toDataURL(), tex: null });
  }
  return cache.get(id);
}

export function iconURL(id) {
  return iconCanvas(id).url;
}

export function iconTexture(id) {
  const e = iconCanvas(id);
  if (!e.tex) {
    e.tex = new THREE.CanvasTexture(e.canvas);
    e.tex.colorSpace = THREE.SRGBColorSpace;
    e.tex.anisotropy = 4;
  }
  return e.tex;
}

// Emote faces for customer reactions.
export function emoteCanvas(kind) {
  const key = 'emote_' + kind;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  // speech bubble
  ctx.beginPath();
  ctx.roundRect(6, 4, 52, 46, 16);
  ctx.moveTo(26, 50);
  ctx.lineTo(32, 60);
  ctx.lineTo(38, 50);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(30,20,40,0.7)';
  ctx.stroke();
  drawFace(ctx, 32, 27, 15, kind);
  const entry = { canvas: c, url: c.toDataURL(), tex: null };
  entry.tex = new THREE.CanvasTexture(c);
  entry.tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, entry);
  return entry;
}

export function faceURL(kind) {
  const key = 'face_' + kind;
  if (!cache.has(key)) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    drawFace(ctx, 32, 32, 28, kind);
    cache.set(key, { url: c.toDataURL() });
  }
  return cache.get(key).url;
}

function drawFace(ctx, x, y, r, kind) {
  if (kind === 'think') {
    ctx.fillStyle = '#6a6a7a';
    [-9, 0, 9].forEach((dx) => {
      ctx.beginPath();
      ctx.arc(x + dx * (r / 15), y, 3.2 * (r / 15), 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }
  const colors = {
    ecstatic: ['#fff08a', '#ffb627'],
    happy: ['#c8ff9a', '#5cc93a'],
    meh: ['#ffe0a0', '#e0a040'],
    angry: ['#ffb0a0', '#e0402a'],
    coin: ['#fff6c4', '#e0a020'],
  };
  const [c0, c1] = colors[kind] ?? colors.happy;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = 'rgba(40,20,10,0.75)';
  ctx.stroke();
  const s = r / 15;
  ctx.fillStyle = '#3a2410';
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 2.2 * s;
  if (kind === 'coin') {
    ctx.font = `900 ${18 * s}px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + s);
    return;
  }
  if (kind === 'ecstatic') {
    // heart eyes
    [-5.5, 5.5].forEach((dx) => {
      const hx = x + dx * s;
      const hy = y - 3 * s;
      ctx.fillStyle = '#ff3a5a';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 3.5 * s);
      ctx.bezierCurveTo(hx - 5 * s, hy, hx - 2 * s, hy - 4 * s, hx, hy - 1.5 * s);
      ctx.bezierCurveTo(hx + 2 * s, hy - 4 * s, hx + 5 * s, hy, hx, hy + 3.5 * s);
      ctx.fill();
    });
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.arc(x, y + 3 * s, 6 * s, 0, Math.PI);
    ctx.fill();
  } else {
    [-5, 5].forEach((dx) => {
      ctx.beginPath();
      ctx.ellipse(x + dx * s, y - 3 * s, 1.8 * s, 2.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.beginPath();
    if (kind === 'happy') ctx.arc(x, y + 2 * s, 5.5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (kind === 'meh') {
      ctx.moveTo(x - 5 * s, y + 6 * s);
      ctx.lineTo(x + 5 * s, y + 4 * s);
    } else if (kind === 'angry') {
      ctx.arc(x, y + 10 * s, 5.5 * s, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.moveTo(x - 8 * s, y - 9 * s);
      ctx.lineTo(x - 2 * s, y - 6 * s);
      ctx.moveTo(x + 8 * s, y - 9 * s);
      ctx.lineTo(x + 2 * s, y - 6 * s);
    }
    ctx.stroke();
    if (kind === 'meh') {
      ctx.fillStyle = '#6ab8ff';
      ctx.beginPath();
      ctx.ellipse(x + 10 * s, y - 6 * s, 2 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
