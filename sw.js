const CACHE_NAME = 'datos-curiosos-v1';
const RUNTIME = 'runtime-cache';
const urlsToCache = [
  'index.html',
  'styles.css',
  'app.js',
  'ui.js',
  'store.js',
  'utils.js',
  'datos.json',
  'icon-192.svg',
  'icon-512.png'
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Fetch: estrategia cache-first para navegacion y cache-then-network para assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar peticiones externas (excepto fonts/cdn) para no romper CORS
  if (url.origin !== location.origin) {
    if (/fonts.googleapis.com|cdnjs.cloudflare.com|fonts.gstatic.com/.test(url.href)) {
      event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(resp => {
        return caches.open(RUNTIME).then(cache => { cache.put(request, resp.clone()); return resp; });
      })));
    }
    return;
  }

  // Para navegación (HTML) usar network-first con fallback a cache
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(RUNTIME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Para recursos estáticos (CSS/JS/images) usar cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        return caches.open(RUNTIME).then(cache => {
          cache.put(request, response.clone());
          return response;
        });
      }).catch(() => {
        if (request.destination === 'image') return caches.match('icon-192.svg');
      });
    })
  );
});

// Activar: limpiar caches viejos y actualizar widgets
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (!currentCaches.includes(cacheName)) return caches.delete(cacheName);
      })
    )).then(() => {
      self.clients.claim();
      // Actualizar widgets cuando se activa el service worker
      return updateWidgets();
    })
  );
});

// === EVENTOS Y FUNCIONES DE WIDGETS PARA WINDOWS 11 ===

self.addEventListener("widgetinstall", event => {
  try {
    if (!event.widget || !event.widget.definition) {
      console.warn("Evento widgetinstall sin widget válido");
      return;
    }
    console.log('Widget instalado:', event.widget.definition.tag);
    event.waitUntil(renderWidget(event.widget));
  } catch (e) {
    console.error("Error en widgetinstall:", e);
  }
});

self.addEventListener("widgetuninstall", event => {
  try {
    if (event.widget && event.widget.definition) {
      console.log('Widget desinstalado:', event.widget.definition.tag);
    }
  } catch (e) {
    console.error("Error en widgetuninstall:", e);
  }
});

self.addEventListener('widgetclick', (event) => {
  try {
    const verb = event.verb || event.action;
    console.log('Acción de widget:', verb);
    switch (verb) {
      case 'saveFavorite':
        event.waitUntil(handleSaveFavorite(event));
        break;
      case 'refreshFact':
        event.waitUntil(handleRefreshFact(event));
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("Error en widgetclick:", e);
  }
});

async function renderWidget(widget) {
  try {
    if (!widget || !widget.definition) throw new Error("Widget inválido");
    const templateUrl = widget.definition.msAcTemplate || widget.definition.template;
    const dataUrl = widget.definition.data;
    if (!templateUrl || !dataUrl) throw new Error("Faltan URLs de template o data en la definición del widget");
    const template = await (await fetch(templateUrl)).text();
    const data = await (await fetch(dataUrl)).text();
    if (self.widgets && self.widgets.updateByTag) {
      await self.widgets.updateByTag(widget.definition.tag, {template, data});
      console.log('Widget renderizado correctamente');
    } else {
      console.warn('API self.widgets.updateByTag no disponible');
    }
  } catch (error) {
    console.error('Error renderizando widget:', error);
  }
}

async function updateWidgets() {
  try {
    if (!self.widgets || !self.widgets.getByTag) {
      console.warn('API self.widgets.getByTag no disponible');
      return;
    }
    const widget = await self.widgets.getByTag("daily-fact");
    if (!widget) {
      console.log('No se encontró widget con tag "daily-fact"');
      return;
    }
    await renderWidget(widget);
  } catch (error) {
    console.error('Error actualizando widgets:', error);
  }
}

async function handleSaveFavorite(event) {
  try {
    if (self.clients && self.clients.openWindow) {
      await self.clients.openWindow('/?action=save&widget=true');
      console.log('Abriendo app para guardar favorito');
    }
  } catch (error) {
    console.error('Error manejando saveFavorite:', error);
  }
}

async function handleRefreshFact(event) {
  try {
    const response = await fetch('/api/daily-fact/refresh', { method: 'POST' });
    if (response.ok) {
      await updateWidgets();
      console.log('Widget actualizado con nuevo dato');
    } else {
      throw new Error('Respuesta no OK al refrescar dato');
    }
  } catch (error) {
    console.error('Error refrescando dato:', error);
    if (self.clients && self.clients.openWindow) {
      await self.clients.openWindow('/?action=refresh&widget=true');
    }
  }
}