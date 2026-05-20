/**
 * LENDAS Service Worker
 * Offline caching and performance optimization
 */

'use strict';

const CACHE_VERSION = 'v2';
const CACHE_NAME = `lendas-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_CACHE_ASSETS = [
    '/',
    '/index.html',
    '/process-type.html',
    '/ctd.html',
    '/vessel.html',
    '/meteostations.html',
    '/air-quality.html',
    '/radiosounding.html',
    '/roms.html',
    '/wrf.html',
    '/traffic.html',
    '/css/base.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/data-display.css',
    '/css/modal.css',
    '/css/notifications.css',
    '/css/observation-common.css',
    '/css/availability-timeline.css',
    '/css/ctd.css',
    '/css/vessel.css',
    '/css/meteostations.css',
    '/css/air-quality.css',
    '/css/radiosounding.css',
    '/css/roms.css',
    '/css/wrf.css',
    '/css/traffic.css',
    '/css/models.css',
    '/js/shared/security.js',
    '/js/shared/i18n.js',
    '/js/shared/constants.js',
    '/js/shared/dom-helpers.js',
    '/js/shared/map-manager.js',
    '/js/shared/availability-style.js',
    '/js/shared/availability-renderer.js',
    '/js/shared/modal-manager.js',
    '/js/shared/chart-helpers.js',
    '/js/shared/wfs-client.js',
    '/js/shared/csv-exporter.js',
    '/js/shared/lazy-loader.js',
    '/js/shared/virtual-scroller.js',
    '/js/utils.js',
    '/js/notifications.js',
    '/js/app.js',
    '/js/ctd.js',
    '/js/vessel.js',
    '/js/meteostations.js',
    '/js/air-quality.js',
    '/js/radiosounding.js',
    '/js/roms.js',
    '/js/wrf.js',
    '/js/traffic.js',
    '/js/process-type.js',
    '/favico.png'
];

// External CDN resources (optional, cache with networkFirst)
const CDN_ASSETS = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js',
    'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js',
    'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=DM+Serif+Display:ital@0;1&display=swap'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching static assets');
            return cache.addAll(STATIC_CACHE_ASSETS).then(() => {
                console.log('[Service Worker] Static assets cached');
            }).catch((error) => {
                console.error('[Service Worker] Failed to cache static assets:', error);
            });
        })
    );

    // Force activation
    self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('lendas-')) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Old caches cleaned');
            // Claim all clients immediately
            return self.clients.claim();
        })
    );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome extensions and other protocols
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Strategy for API requests: always network, no dynamic caching by default
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // Strategy for static assets (cacheFirst with network fallback)
    if (url.pathname.startsWith('/css/') ||
        url.pathname.startsWith('/js/') ||
        url.pathname.startsWith('/fonts/') ||
        STATIC_CACHE_ASSETS.some(asset => url.pathname.endsWith(asset))) {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }

    // Strategy for HTML pages (staleWhileRevalidate)
    if (url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(staleWhileRevalidateStrategy(request));
        return;
    }

    // Strategy for CDN assets (networkFirst)
    if (CDN_ASSETS.some(asset => url.href === asset || url.href.startsWith(asset))) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Default: networkFirst
    event.respondWith(networkFirstStrategy(request));
});

/**
 * Cache First strategy
 * Serve from cache, fall back to network
 * @param {Request} request
 * @returns {Promise<Response>}
 */
function cacheFirstStrategy(request) {
    return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
            // Return cached response
            return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request).then((networkResponse) => {
            // Clone the response before caching
            const responseToCache = networkResponse.clone();

            // Only cache successful responses
            if (networkResponse.ok && request.method === 'GET') {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache).catch(() => {
                        // Ignore caching errors
                    });
                });
            }

            return networkResponse;
        }).catch(() => {
            // Network failed, return offline fallback
            return new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/plain' })
            });
        });
    });
}

/**
 * Network First strategy
 * Try network first, fall back to cache
 * @param {Request} request
 * @returns {Promise<Response>}
 */
function networkFirstStrategy(request) {
    return fetch(request).then((networkResponse) => {
        // Clone the response before caching
        const responseToCache = networkResponse.clone();

        // Cache successful GET responses
        if (networkResponse.ok && request.method === 'GET') {
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache).catch(() => {
                    // Ignore caching errors
                });
            });
        }

        return networkResponse;
    }).catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // Not in cache, return offline fallback
            return new Response('Offline - No cached data available', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/plain' })
            });
        });
    });
}

/**
 * Stale While Revalidate strategy
 * Serve from cache immediately, update from network
 * @param {Request} request
 * @returns {Promise<Response>}
 */
function staleWhileRevalidateStrategy(request) {
    return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
            // Fetch from network in background
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse.ok && request.method === 'GET') {
                    cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            }).catch(() => {
                // Network failed, return cached response
                return cachedResponse;
            });

            // Return cached response immediately, or wait for network
            return cachedResponse || fetchPromise;
        });
    });
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
    const { action, data } = event.data;

    switch (action) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            clearCache();
            break;

        case 'GET_CACHE_SIZE':
            getCacheSize().then((size) => {
                event.ports[0].postMessage({ size });
            });
            break;

        default:
            console.log('[Service Worker] Unknown message action:', action);
    }
});

/**
 * Clear all caches
 * @returns {Promise<void>}
 */
function clearCache() {
    return caches.keys().then((cacheNames) => {
        return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
        );
    }).then(() => {
        console.log('[Service Worker] All caches cleared');
    });
}

/**
 * Get cache size
 * @returns {Promise<number>} Size in bytes
 */
function getCacheSize() {
    let totalSize = 0;

    return caches.keys().then((cacheNames) => {
        return Promise.all(
            cacheNames.map((cacheName) => {
                return caches.open(cacheName).then((cache) => {
                    return cache.keys().then((requests) => {
                        return Promise.all(
                            requests.map((request) => {
                                return cache.match(request).then((response) => {
                                    if (response) {
                                        const size = +response.headers.get('Content-Length') || 0;
                                        totalSize += size;
                                    }
                                });
                            })
                        );
                    });
                });
            })
        ).then(() => totalSize);
    });
}

// Enable navigation preload if available
if ('navigationPreload' in self.registration) {
    self.addEventListener('activate', (event) => {
        event.waitUntil(self.registration.navigationPreload.enable());
    });
}
