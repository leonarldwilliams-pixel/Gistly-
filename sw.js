// Gistly service worker v2: opens instantly from the phone, refreshes quietly, shows notifications.
const CACHE = 'gistly-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;          // never touch live data
  if (r.mode === 'navigate') {                                                   // page: show saved copy now, update behind it
    e.respondWith(caches.match('./index.html').then(hit => {
      const net = fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put('./index.html', res.clone())); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    if (res.ok && (u.origin === location.origin || u.hostname.includes('jsdelivr'))) caches.open(CACHE).then(c => c.put(r, res.clone()));
    return res; }).catch(() => hit)));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Gistly', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag, data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ open: url }); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
