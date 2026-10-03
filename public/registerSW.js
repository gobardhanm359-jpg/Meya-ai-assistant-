if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[Mahi Ai PWA] Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('[Mahi Ai PWA] Service Worker registration failed:', error);
      });
  });
}
