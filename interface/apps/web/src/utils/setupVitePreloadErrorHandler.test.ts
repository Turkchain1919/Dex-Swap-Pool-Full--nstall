import { logger } from 'utilities/src/logger/logger'
import { describe, expect, it, vi } from 'vitest'
import { setupVitePreloadErrorHandler } from '~/utils/setupVitePreloadErrorHandler'

vi.mock('utilities/src/logger/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('setupVitePreloadErrorHandler', () => {
  it('logs the failure without cancelling the event, so the failed import still rejects', () => {
    setupVitePreloadErrorHandler()

    // Vite only lets a failed dynamic import reject when the event is NOT default-prevented;
    // a cancelled event makes the import resolve undefined instead
    const event = new Event('vite:preloadError', { cancelable: true })
    Object.assign(event, { payload: new Error('Failed to fetch dynamically imported module') })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(logger.warn).toHaveBeenCalledWith(
      'setupVitePreloadErrorHandler.ts',
      'vite:preloadError',
      'Dynamic import failed to load',
      { error: 'Failed to fetch dynamically imported module' },
    )
  })
})
