import * as THREE from 'three';
import { Area } from './Area.js';
import { Textures, boxUV } from '../render/Textures.js';
import { makePedestal, makeChest, makeFlame, makeBarrel, makeCrate, makePot, makeBush, mat, RoundedBoxGeometry } from '../render/Models.js';
import { sunState } from '../render/Sky.js';
import { iconTexture } from '../ui/Icons.js';

const W = 8; // half width (x)
const N = -8; // north wall z
const S = 7; // south wall z
const H = 4.4;

function priceSprite() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(0.9, 0.34, 1);
  spr.userData.draw = (text, qty) => {
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 96);
    if (!text) {
      tex.needsUpdate = true;
      return;
    }
    ctx.fillStyle = 'rgba(20,16,28,0.78)';
    ctx.beginPath();
    ctx.roundRect(8, 12, 240, 72, 36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,211,90,0.8)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = '900 44px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd35a';
    ctx.fillText(text + (qty > 1 ? ` ×${qty}` : ''), 128, 50);
    tex.needsUpdate = true;
  };
  return spr;
}

export class ShopInterior extends Area {
  constructor(game) {
    super(game, 'shop');
    this.viewLight = { hemi: 0.9, sun: 0.9, fill: 0.6 };
    this.doorPos = new THREE.Vector3(0, 0, S - 0.8);
    this.queueZ = -2.6;
    this.build();
  }

  build() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x0a0a10);
    scene.fog = new THREE.Fog(0x2a2018, 18, 40);

    // ---- materials
    const wood = Textures.wood();
    const floorMat = new THREE.MeshStandardMaterial({
      map: wood.map,
      normalMap: wood.normalMap,
      roughnessMap: wood.roughnessMap,
      color: 0xd8b48a,
    });
    const pl = Textures.plaster();
    const wallMat = new THREE.MeshStandardMaterial({ map: pl.map, normalMap: pl.normalMap, color: 0xf2e6d2, roughness: 0.95 });
    const beamMat = new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, color: 0x7a5234, roughness: 0.8 });

    // ---- floor & ceiling
    const fw = W * 2;
    const fd = S - N;
    const floorGeo = new THREE.PlaneGeometry(fw, fd);
    floorGeo.rotateX(-Math.PI / 2);
    const uv = floorGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * fw) / 3, (uv.getY(i) * fd) / 3);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0, (S + N) / 2);
    floor.receiveShadow = true;
    scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(fw + 2, fd + 2), beamMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H, (S + N) / 2);
    ceil.receiveShadow = true;
    ceil.castShadow = true;
    scene.add(ceil);
    for (let z = N + 1.5; z < S; z += 3) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.3, 0.3), beamMat);
      b.position.set(0, H - 0.15, z);
      b.castShadow = true;
      scene.add(b);
    }

    // ---- walls with window & door openings
    const box = (x0, x1, y0, y1, z0, z1, m = wallMat) => {
      const w = x1 - x0;
      const h = y1 - y0;
      const d = z1 - z0;
      const g = boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, 3);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    const T = 0.4;
    // north wall (solid)
    box(-W - T, W + T, 0, H, N - T, N);
    this.collision.addBox(-W - T, N - T, W + T, N);
    // south wall: [-W,-6] win[-6,-4] [-4,-1] door[-1,1] [1,4] win[4,6] [6,W]
    const southSegs = [
      [-W - T, -6],
      [-4, -1.1],
      [1.1, 4],
      [6, W + T],
    ];
    for (const [a, b] of southSegs) {
      box(a, b, 0, H, S, S + T);
      this.collision.addBox(a, S, b, S + T);
    }
    for (const [a, b] of [
      [-6, -4],
      [4, 6],
    ]) {
      box(a, b, 0, 1.2, S, S + T);
      box(a, b, 2.9, H, S, S + T);
      this.collision.addBox(a, S, b, S + T);
      this.addWindowGlass((a + b) / 2, 2.05, S + T / 2, 0, b - a);
    }
    box(-1.1, 1.1, 2.7, H, S, S + T);
    this.collision.addBox(-1.1, S + 0.1, 1.1, S + T); // door: blocked slightly outside
    // side walls with one window each at z in [-1.5, 0.5]
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? -W - T : W;
      const x1 = sx < 0 ? -W : W + T;
      box(x0, x1, 0, H, N, -1.5);
      box(x0, x1, 0, H, 0.5, S);
      box(x0, x1, 0, 1.2, -1.5, 0.5);
      box(x0, x1, 2.9, H, -1.5, 0.5);
      this.collision.addBox(x0, N, x1, S);
      this.addWindowGlass(sx * (W + T / 2), 2.05, -0.5, Math.PI / 2, 2);
    }
    // wainscot trim
    for (const [x0, x1, z0, z1] of [
      [-W, W, N, N + 0.08],
      [-W, -W + 0.08, N, S],
      [W - 0.08, W, N, S],
    ]) {
      const t = box(x0, x1, 0, 1.0, z0, z1, beamMat);
      t.castShadow = false;
    }

    // bright "outside" backdrops for windows & door (unlit)
    this.outsideMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.1) });
    const back = (x, z, ry, w) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 5), this.outsideMat);
      m.position.set(x, 2, z);
      m.rotation.y = ry;
      scene.add(m);
    };
    back(0, S + 3, Math.PI, 20);
    back(-W - 3, 0, Math.PI / 2, 20);
    back(W + 3, 0, -Math.PI / 2, 20);

    // door frame + open door leaf
    const door = new THREE.Mesh(new RoundedBoxGeometry(1.1, 2.6, 0.1, 2, 0.03), beamMat);
    door.position.set(-1.55, 1.3, S - 0.5);
    door.rotation.y = -1.2;
    door.castShadow = true;
    scene.add(door);
    this.addInteract({
      pos: new THREE.Vector3(0, 0, S - 0.7),
      radius: 1.8,
      label: 'Leave the shop',
      action: () => this.game.changeArea('village', { spawn: 'shopDoor' }),
    });

    // ---- lights
    this.hemi = new THREE.HemisphereLight(0xfff0e0, 0x4a3020, 0.6);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -14;
    sc.right = 14;
    sc.top = 14;
    sc.bottom = -14;
    sc.near = 1;
    sc.far = 60;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun, this.sun.target);
    this.lamps = [];
    for (const [x, z] of [
      [-3.5, 1.5],
      [3.5, 1.5],
      [0, -5.8],
    ]) {
      const l = new THREE.PointLight(0xffb070, 6, 11, 1.5);
      l.position.set(x, H - 0.9, z);
      l.castShadow = false;
      scene.add(l);
      const lantern = new THREE.Group();
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4), mat(0x222222));
      chain.position.y = 0.45;
      const cage = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.14, 0.35, 6),
        new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa040, emissiveIntensity: 2.5, transparent: true, opacity: 0.9 }),
      );
      const capm = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 6), mat(0x2a2a30, { metalness: 0.6 }));
      capm.position.y = 0.25;
      lantern.add(chain, cage, capm);
      lantern.position.set(x, H - 1.0, z);
      scene.add(lantern);
      this.lamps.push({ light: l, lantern });
    }

    // ---- counter, register & ledger
    const counterMat = new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, color: 0xa87448, roughness: 0.6 });
    const counter = new THREE.Mesh(new RoundedBoxGeometry(5.2, 1.05, 0.9, 3, 0.05), counterMat);
    counter.position.set(0, 0.525, -3.7);
    counter.castShadow = counter.receiveShadow = true;
    scene.add(counter);
    const top = new THREE.Mesh(new RoundedBoxGeometry(5.5, 0.08, 1.1, 2, 0.03), beamMat);
    top.position.set(0, 1.08, -3.7);
    top.castShadow = true;
    scene.add(top);
    this.collision.addBox(-2.75, -4.25, 2.75, -3.15);

    const reg = new THREE.Group();
    const regBody = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.35, 0.5, 2, 0.04), mat(0xc9a040, { metalness: 0.8, roughness: 0.3 }));
    regBody.position.y = 0.17;
    const regTop = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.25, 0.2, 2, 0.03), mat(0xb08a30, { metalness: 0.8, roughness: 0.3 }));
    regTop.position.set(0, 0.42, -0.12);
    regTop.rotation.x = -0.4;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe0c050, { metalness: 0.9, roughness: 0.2 }));
    bell.position.set(0.28, 0.35, 0.18);
    reg.add(regBody, regTop, bell);
    reg.position.set(1.3, 1.12, -3.7);
    reg.traverse((c) => c.isMesh && (c.castShadow = true));
    scene.add(reg);
    this.addInteract({
      pos: new THREE.Vector3(1.3, 0, -4.6),
      radius: 2.2,
      label: () => (this.game.shop.queue.length ? 'Serve customer' : this.game.shop.open ? 'Close the shop' : 'Open the shop'),
      sub: () => {
        const q = this.game.shop.queue[0];
        if (q) return `${q.item.qty > 1 ? q.item.qty + '× ' : ''}${(q.price * q.item.qty).toLocaleString()} gold`;
        return this.game.shop.open ? '' : 'Customers visit 07:00 – 19:00';
      },
      action: () => {
        if (!this.game.shop.checkout()) this.game.shop.toggle();
      },
    });
    // ledger book
    const book = new THREE.Group();
    const cover = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.08, 0.4, 2, 0.02), mat(0x6a2a3a, { roughness: 0.6 }));
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.36), mat(0xf4ecd8));
    pages.position.y = 0.05;
    book.add(cover, pages);
    book.position.set(-1.3, 1.16, -3.7);
    book.rotation.y = 0.2;
    scene.add(book);
    const candle = makeFlame(0.25, 0xffb050);
    candle.position.set(-2.1, 1.45, -3.6);
    scene.add(candle);
    this.flames.push(candle);
    const cstick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 10), mat(0xf4ecd8));
    cstick.position.set(-2.1, 1.25, -3.6);
    scene.add(cstick);
    this.addInteract({
      pos: new THREE.Vector3(-1.3, 0, -4.6),
      radius: 1.8,
      label: 'Read the price ledger',
      action: () => this.game.ui.openLedger(),
    });

    // ---- sign by the door
    const sign = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.5, 0.06, 2, 0.03), mat(0x3a2a1a));
    sign.position.set(2.0, 2.0, S - 0.05);
    sign.rotation.y = Math.PI;
    this.signMat = new THREE.MeshStandardMaterial({ color: 0xff5050, emissive: 0xff3030, emissiveIntensity: 1.5 });
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), this.signMat);
    signFace.position.set(2.0, 2.0, S - 0.09);
    signFace.rotation.y = Math.PI;
    scene.add(sign, signFace);
    this.signCanvas = document.createElement('canvas');
    this.signCanvas.width = 256;
    this.signCanvas.height = 90;
    this.signTex = new THREE.CanvasTexture(this.signCanvas);
    this.signTex.colorSpace = THREE.SRGBColorSpace;
    this.signMat.map = this.signTex;
    this.signMat.emissiveMap = this.signTex;
    this.updateSign();

    // ---- pedestals
    this.pedestals = [];
    const spots = [
      [-4.5, 3.6],
      [4.5, 3.6],
      [-4.5, 0.9],
      [4.5, 0.9],
      [-4.5, -1.8],
      [4.5, -1.8],
    ];
    spots.forEach(([x, z], i) => {
      const g = makePedestal();
      g.position.set(x, 0, z);
      scene.add(g);
      const itemSpr = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      itemSpr.scale.set(0.6, 0.6, 1);
      itemSpr.position.set(x, 1.45, z);
      itemSpr.visible = false;
      scene.add(itemSpr);
      const price = priceSprite();
      price.position.set(x + (x < 0 ? 0.6 : -0.6), 1.2, z);
      scene.add(price);
      const col = this.collision.addBoxCentered(x, z, 1.2, 1.2);
      const view = new THREE.Vector3(x < 0 ? -2.9 : 2.9, 0, z);
      const info = {
        group: g,
        itemSpr,
        price,
        col,
        viewSpot: view,
        faceYaw: x < 0 ? -Math.PI / 2 : Math.PI / 2,
        claimed: null,
        index: i,
      };
      this.pedestals.push(info);
      info.interact = this.addInteract({
        pos: new THREE.Vector3(x + (x < 0 ? 1.0 : -1.0), 0, z),
        radius: 1.9,
        enabled: () => i < this.game.state.pedestalCount(),
        label: () => {
          const p = this.game.state.pedestals[i];
          return p.item ? 'Adjust display' : 'Place an item for sale';
        },
        sub: () => {
          const p = this.game.state.pedestals[i];
          return p.item ? `${p.price.toLocaleString()}g each` : '';
        },
        action: () => this.game.ui.openPedestal(i),
      });
    });

    // ---- private area: bed, storage chest, decor
    const bed = new THREE.Group();
    const frame = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.45, 3.0, 2, 0.06), beamMat);
    frame.position.y = 0.3;
    const quilt = Textures.cloth(0.3, 0.35, 0.65);
    const mattress = new THREE.Mesh(
      new RoundedBoxGeometry(1.85, 0.3, 2.8, 3, 0.1),
      new THREE.MeshStandardMaterial({ map: quilt.map, normalMap: quilt.normalMap, roughness: 1 }),
    );
    mattress.position.y = 0.62;
    const pillow = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.2, 0.5, 3, 0.09), mat(0xf4f0e8, { roughness: 1 }));
    pillow.position.set(0, 0.85, -1.05);
    const headboard = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.3, 0.15, 2, 0.05), beamMat);
    headboard.position.set(0, 0.8, -1.5);
    bed.add(frame, mattress, pillow, headboard);
    bed.position.set(-6.2, 0, -6.2);
    bed.traverse((c) => c.isMesh && ((c.castShadow = true), (c.receiveShadow = true)));
    scene.add(bed);
    this.collision.addBox(-7.3, -7.8, -5.1, -4.6);
    this.addInteract({
      pos: new THREE.Vector3(-5.0, 0, -5.4),
      radius: 2.0,
      label: 'Sleep',
      sub: () => (this.game.canSleep() ? 'Skip to the next morning (saves the game)' : 'Too early to sleep (after 17:00)'),
      action: () => this.game.sleep(),
    });

    const chest = makeChest(0x8a5a2e);
    chest.position.set(6.2, 0, -7.0);
    scene.add(chest);
    this.chestModel = chest;
    this.collision.addBoxCentered(6.2, -7.0, 1.2, 0.8);
    this.addInteract({
      pos: new THREE.Vector3(6.2, 0, -6.2),
      radius: 1.9,
      label: 'Open storage chest',
      action: () => this.game.ui.openChest(),
    });

    // shelves
    const shelf = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.5), beamMat);
      b.position.y = 0.9 + i * 0.8;
      shelf.add(b);
      for (let k = 0; k < 4; k++) {
        const item =
          (i + k) % 3 === 0
            ? makePot([0xb86a3a, 0x6a8aa0, 0x9a6ab0][k % 3])
            : new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.4, 0.25, 2, 0.03), mat([0x7a2a2a, 0x2a4a7a, 0x3a6a3a, 0x7a5a2a][k]));
        item.scale.multiplyScalar(0.55);
        item.position.set(-0.9 + k * 0.6, 0.95 + i * 0.8 + ((i + k) % 3 === 0 ? 0 : 0.11), 0);
        shelf.add(item);
      }
    }
    shelf.position.set(2.6, 0, N + 0.35);
    shelf.traverse((c) => c.isMesh && (c.castShadow = true));
    scene.add(shelf);
    this.collision.addBoxCentered(2.6, N + 0.35, 2.4, 0.6);

    const b1 = makeBarrel();
    b1.position.set(W - 0.8, 0, S - 1.2);
    const c1 = makeCrate(0.8);
    c1.position.set(-W + 0.8, 0, S - 1.2);
    const plant = makeBush(Math.random);
    plant.scale.setScalar(0.7);
    plant.position.set(-W + 0.8, 0, 2.3);
    const potBase = makePot(0x9a5a3a);
    potBase.position.set(-W + 0.8, 0, 2.3);
    potBase.scale.setScalar(0.9);
    plant.position.y = 0.5;
    scene.add(b1, c1, plant, potBase);
    this.collision.addCircle(W - 0.8, S - 1.2, 0.5);
    this.collision.addCircle(-W + 0.8, S - 1.2, 0.55);
    this.collision.addCircle(-W + 0.8, 2.3, 0.45);

    // upgrade decor (hidden until purchased)
    const rugTex = Textures.cloth(0.55, 0.12, 0.2);
    this.rug = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 8),
      new THREE.MeshStandardMaterial({ map: rugTex.map, normalMap: rugTex.normalMap, roughness: 1, color: 0xffffff }),
    );
    this.rug.rotation.x = -Math.PI / 2;
    this.rug.position.set(0, 0.015, 1.8);
    this.rug.receiveShadow = true;
    scene.add(this.rug);
    const rugBorder = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.1, 4),
      mat(0xe0a93a),
    );
    this.rug.add(rugBorder);

    this.chandelier = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 32), mat(0xd9a441, { metalness: 0.9, roughness: 0.3 }));
    ring.rotation.x = Math.PI / 2;
    this.chandelier.add(ring);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cr = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.12, 0),
        new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x6ac8ff, emissiveIntensity: 2.5, roughness: 0.1 }),
      );
      cr.position.set(Math.cos(a) * 0.8, -0.2, Math.sin(a) * 0.8);
      cr.scale.y = 1.8;
      this.chandelier.add(cr);
    }
    const cl = new THREE.PointLight(0x9ad8ff, 8, 12, 1.5);
    cl.position.y = -0.3;
    this.chandelier.add(cl);
    this.chandelier.position.set(0, H - 0.9, 1.5);
    scene.add(this.chandelier);

    // dust in sun beams
    this.dustTimer = 0;
    this.spawn.set(0, 0, S - 1.6);
    this.spawnYaw = 0;
    this.applyUpgrades();
    this.refreshPedestals();
  }

  addWindowGlass(x, y, z, ry, w) {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 1.7),
      new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.1 }),
    );
    g.position.set(x, y, z);
    g.rotation.y = ry;
    g.castShadow = false;
    this.scene.add(g);
    const frameMat = mat(0x6a4428);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.7, 0.07), frameMat);
    bar.position.set(x, y, z);
    bar.rotation.y = ry;
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.07), frameMat);
    bar2.position.set(x, y, z);
    bar2.rotation.y = ry;
    bar.castShadow = bar2.castShadow = true;
    this.scene.add(bar, bar2);
  }

  updateSign() {
    const ctx = this.signCanvas.getContext('2d');
    const open = this.game.shop?.open;
    ctx.fillStyle = open ? '#1e5a2a' : '#5a1e22';
    ctx.fillRect(0, 0, 256, 90);
    ctx.font = '900 54px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = open ? '#9fffb0' : '#ffb0a0';
    ctx.fillText(open ? 'OPEN' : 'CLOSED', 128, 48);
    this.signTex.needsUpdate = true;
    this.signMat.color.set(0xffffff);
    this.signMat.emissive.set(0xffffff);
    this.signMat.emissiveIntensity = 1.2;
  }

  applyUpgrades() {
    const u = this.game.state.upgrades;
    this.rug.visible = !!u.rug;
    this.chandelier.visible = !!u.chandelier;
    const n = this.game.state.pedestalCount();
    this.pedestals.forEach((p, i) => {
      p.group.visible = i < n;
      p.col.active = i < n;
    });
  }

  refreshPedestals() {
    const s = this.game.state;
    this.pedestals.forEach((p, i) => {
      const ped = s.pedestals[i];
      if (ped.item && i < s.pedestalCount()) {
        p.itemSpr.material.map = iconTexture(ped.item.id);
        p.itemSpr.material.needsUpdate = true;
        p.itemSpr.visible = true;
        p.price.userData.draw(`${ped.price.toLocaleString()}g`, ped.item.qty);
        p.price.visible = true;
      } else {
        p.itemSpr.visible = false;
        p.price.visible = false;
      }
    });
  }

  enter(opts = {}) {
    this.applyUpgrades();
    this.refreshPedestals();
    this.updateSign();
    this.game.audio.setMusic('shop');
    this.updateLighting();
  }

  updateLighting() {
    const game = this.game;
    const s = sunState(game.state.minutes);
    const useSun = s.sunDir.y > 0.02;
    const dir = useSun ? s.sunDir : s.moonDir;
    // light enters through the south windows
    const d = new THREE.Vector3(dir.x * 0.6, Math.max(0.25, dir.y), Math.abs(dir.z) + 0.6).normalize();
    this.sun.position.set(d.x * 30, d.y * 30, d.z * 30);
    this.sun.target.position.set(0, 0, 0);
    const dayI = THREE.MathUtils.smoothstep(s.sunDir.y, 0.0, 0.3);
    this.sun.intensity = useSun ? 5.5 * dayI : 0.6;
    this.sun.color.setRGB(useSun ? 1 : 0.6, useSun ? 0.9 - s.sunset * 0.25 : 0.7, useSun ? 0.78 - s.sunset * 0.4 : 1.0);
    const night = 1 - s.day;
    this.hemi.intensity = 0.25 + 0.45 * s.day;
    this.outsideMat.color.setRGB(0.15 + 1.6 * s.day + s.sunset * 0.5, 0.18 + 1.7 * s.day, 0.35 + 1.9 * s.day - s.sunset * 0.4);
    for (const l of this.lamps) l.light.intensity = 3 + night * 7;
    const gr = game.engine.grade.uniforms;
    gr.uExposure.value = 1.05 + night * 0.25;
    gr.uSaturation.value = 1.1;
    gr.uTint.value.setRGB(1.02, 1.0, 0.97);
    gr.uSunAmount.value = 0;
    this.scene.environmentIntensity = 0.25;
    this.viewLight.hemi = 0.6 + 0.4 * s.day;
    this.viewLight.sun = 0.4 + 0.6 * dayI;
  }

  update(dt, t) {
    super.update(dt, t);
    this.updateLighting();
    this.chandelier.rotation.y = t * 0.1;
    this.lamps.forEach((l, i) => {
      l.lantern.rotation.z = Math.sin(t * 0.8 + i) * 0.03;
    });
    // floating dust (visible in sun shafts)
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = 0.1;
      this.sparks.emit({
        x: (Math.random() - 0.5) * 14,
        y: 0.5 + Math.random() * 3,
        z: (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 0.05,
        vy: 0.02,
        vz: (Math.random() - 0.5) * 0.05,
        color: [0.35, 0.3, 0.22],
        size: 0.03,
        life: 6,
        alpha: 0.8,
      });
    }
  }
}
