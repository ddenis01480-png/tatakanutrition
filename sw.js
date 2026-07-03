const CACHE='tatanka-v63';
const ASSETS=[
  '/hero.jpg',
  'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js'
];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);

  // index.html — toujours réseau, jamais cache
  if(url.pathname==='/'||url.pathname==='/index.html'){
    e.respondWith(
      fetch(e.request).catch(()=>caches.match('/index.html'))
    );
    return;
  }

  // Supabase et APIs — toujours réseau
  if(url.hostname.includes('supabase.co')||url.hostname.includes('openfoodfacts.org')){
    e.respondWith(fetch(e.request).catch(()=>new Response('{}',{headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Assets statiques — cache first
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(response=>{
        if(response.ok&&(url.origin===self.location.origin||url.hostname.includes('cdnjs'))){
          const clone=response.clone();
          caches.open(CACHE).then(c=>c.put(e.request,clone));
        }
        return response;
      }).catch(()=>{
        if(e.request.destination==='document')return caches.match('/index.html');
      });
    })
  );
});
