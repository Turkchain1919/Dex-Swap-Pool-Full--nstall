import { logger } from 'utilities/src/logger/logger'

export function setupVitePreloadErrorHandler(): void {
  // Observability only — the event must keep its default behavior so the failed dynamic
  // import rejects and callers (e.g. lazyWithRetry) can retry or recover. Calling
  // event.preventDefault() here would make failed imports resolve `undefined` instead.
  window.addEventListener('vite:preloadError', (event) => {
    logger.warn('setupVitePreloadErrorHandler.ts', 'vite:preloadError', 'Dynamic import failed to load', {
      error: event.payload.message,
    })
  })
}
