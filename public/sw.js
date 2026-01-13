// Simple Service Worker for PWA
const CACHE_NAME = 'muse-ai-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic pass-through strategy. 
  // For a full offline experience, you would cache assets here.
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response("You are offline.");
    })
  );
});