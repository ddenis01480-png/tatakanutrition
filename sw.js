const CACHE='tatanka-v34';
const ASSETS=[
  '/',
  '/index.html',
  '/hero.jpg',
  'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js'
];

// Installation — mise en cache des assets
self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

// Fetch — cache first pour les assets, network first pour l'API Open Food Facts
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);

  // Open Food Facts — toujours réseau (données fraîches)
  if(url.hostname.includes('openfoodfacts.org')){
    e.respondWith(fetch(e.request).catch(()=>new Response('{}',{headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Tout le reste — cache first, réseau en fallback
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(response=>{
        // Mettre en cache les nouvelles ressources statiques
        if(response.ok&&(url.origin===self.location.origin||url.hostname.includes('cdnjs'))){
          const clone=response.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return response;
      }).catch(()=>{
        // Offline — retourner l'app principale
        if(e.request.destination==='document')return caches.match('/index.html');
      });
    })
  );
});
