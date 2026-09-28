// Offline cache for the installed game: serve cached files first, refresh them in the background.
const CACHE = 'moonkeeper-v8';
const FILES = ['./', './index.html', './manifest.webmanifest',
  './js/engine.js', './js/voice.js', './js/art.js', './js/pixelui.js', './js/data.js', './js/ui.js', './js/hud.js', './js/postfx.js',
  './js/entities.js', './js/dungeon.js', './js/town.js', './js/shop.js', './js/menus.js', './js/craft.js', './js/minigame.js', './js/tutorial.js', './js/story.js', './js/main.js',
  './fonts/pixelify-sans-latin-400-normal.woff2', './fonts/pixelify-sans-latin-700-normal.woff2', './fonts/silkscreen-latin-400-normal.woff2', './fonts/silkscreen-latin-700-normal.woff2',
  './img/townsfolk.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r && r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});
