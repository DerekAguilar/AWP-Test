// Estructura básica de Service Worker

// 1. Nombre del caché y archivos a cachear
const CACHE_NAME='mi-cache-v1';
const urlsToCache=[
    "index.html",
    "/icons/icon192.png",
    "/icons/icon512.png"
];
const offlineUrl="offline.html"

// 2. INSTALL -> se ejecuta al instalar el SW
self.addEventListener("install",event=>{
    event.waitUntil(
        (async ()=> {
            const cache=await caches.open(CACHE_NAME);
            // Configurar {cache: 'reload'} en otra solicitud asegura que
            // la respuesta no se satisface de la caché HTTP, para que
            // provenga de la red
            await cache.add(new Request(offlineUrl, {cache:"reload"}));
        })()
    );
    // Obligar a sw de espera a volverse el sw activo
    self.skipWaiting();
});

// 3. ACTIVATE -> se ejecuta al activarse (limpia cachés viejas)
self.addEventListener("activate",event=>{
    event.waitUntil(
        (async ()=> {
            // habilitar precarga de navegación si el navegador es compatible
            // Véase https://developers.google.com/web/updates/2017/02/navigation-preload
            if ("navigationPreload" in self.registration) {
                await self.registration.navigationPreload.enable
            }
        })()
    );

    // Decirle al sw activo que tome control de la página
    self.clients.claim();
});

// 4. FETCH -> intercepta peticiones de la app
// Intercepta cada petición de la PWA
// Busca primero en caché
// Si no está, busca en Internet
// En caso de falla, muestra offline.html
self.addEventListener("fetch",event=>{
    // Solo queremos llamar a respondWith() si se hace una
    // solicitud de navegación a una página HTML
    if (event.request.mode==="navigate") {
        event.respondWith(
            (async ()=> {
                try {
                    // Primero intentar usar la respuesta de precarga si es compatible
                    const preloadResponse=await event.preloadResponse;
                    if (preloadResponse) {
                        return preloadResponse;
                    }

                    // Siempre empezar tratando de cargar de la red
                    const networkResponse=await fetch(event.request);
                    return networkResponse;
                } catch (error) {
                    // se activa al salir un error, muy probablemente
                    // por error de red
                    // Si fetch() regresa una respuesta HTTP válida con código de
                    // respuesta 4xx o 5xx, catch() no se activará
                    console.log("Falló el fetch; regresando página offline. ",error);

                    const cache=await caches.open(CACHE_NAME);
                    const cachedResponse=await cache.match(offlineUrl);
                    return cachedResponse;
                }
            })()
        );
    }

    // Si if() es false, este gestor de fetch() no interceptará la
    // solicitud. Si hay otros gestores fetch registrados,
    // cada uno tendrá oportunidad de ejecutar respondWith(). Si ninguno
    // usa esta función, la solicitud la maneja el navegador como si
    // el sw no estuviera
});

// 5. PUSH -> notificaciones en segundo plano
// Manejo de notificaciones push (opcional)
self.addEventListener("push",event=>{
    const data=event.data ? event.data.text() : "Notificación sin texto";
    event.waitUntil(
        self.registration.showNotification("Mi PWA",{body:data})
    );
});