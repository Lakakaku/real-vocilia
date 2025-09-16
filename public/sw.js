// Service Worker for Vocilia Customer Entry Flow
// Provides offline functionality and caching for better performance

const CACHE_NAME = 'vocilia-customer-v1';
const OFFLINE_URL = '/offline';

// Resources to cache on install
const CORE_RESOURCES = [
  '/',
  '/offline',
  '/manifest.json',
  // Add other critical resources here
];

// Resources to cache on first request
const RUNTIME_CACHE = [
  // API endpoints that can be cached
  '/api/stores/validate-code'
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core resources');
        return cache.addAll(CORE_RESOURCES);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache core resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { method, url } = request;

  // Only handle GET requests
  if (method !== 'GET') {
    return;
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If online, return the response and cache it
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // If offline, try to serve from cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }

              // If no cached version, serve offline page
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle API requests
  if (url.includes('/api/')) {
    event.respondWith(
      handleApiRequest(request)
    );
    return;
  }

  // Handle static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      handleStaticAsset(request)
    );
    return;
  }

  // For all other requests, use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request);
      })
  );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful GET requests
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed for API request:', url.pathname);

    // For store validation, we need to be online
    if (url.pathname.includes('/validate-code')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'No internet connection. Please check your network and try again.'
          }
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Try to serve from cache for other API requests
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline error
    return new Response(
      JSON.stringify({
        error: 'Service unavailable offline'
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);

    // Try one more time from cache
    return caches.match(request);
  }
}

// Check if URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot', '.ico'
  ];

  return staticExtensions.some(ext => url.includes(ext));
}

// Handle background sync for offline form submissions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'store-code-validation') {
    event.waitUntil(
      processOfflineValidations()
    );
  }
});

// Process offline store code validations when back online
async function processOfflineValidations() {
  try {
    // Get pending validations from IndexedDB
    const pendingValidations = await getPendingValidations();

    for (const validation of pendingValidations) {
      try {
        const response = await fetch('/api/stores/validate-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validation.data)
        });

        if (response.ok) {
          // Remove from pending queue
          await removePendingValidation(validation.id);

          // Notify the client
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'OFFLINE_VALIDATION_COMPLETE',
              data: validation
            });
          });
        }
      } catch (error) {
        console.error('[SW] Failed to process offline validation:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to process offline validations:', error);
  }
}

// IndexedDB helpers for offline queue
async function getPendingValidations() {
  // Implementation would use IndexedDB to store pending requests
  // For now, return empty array
  return [];
}

async function removePendingValidation(id) {
  // Implementation would remove item from IndexedDB
  // For now, just log
  console.log('[SW] Would remove pending validation:', id);
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');

  const options = {
    body: 'You have new feedback to review',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'vocilia-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Vocilia', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if Vocilia is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

// Logging for debugging
console.log('[SW] Service worker script loaded');