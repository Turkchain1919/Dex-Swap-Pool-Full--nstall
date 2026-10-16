import { identify, track } from '@amplitude/analytics-browser'
import { SharedEventName } from '@uniswap/analytics-events'
import { analytics } from 'utilities/src/telemetry/analytics/analytics.web'

vi.mock('@amplitude/analytics-browser', () => {
  class Identify {
    set(): this {
      return this
    }
    postInsert(): this {
      return this
    }
    clearAll(): this {
      return this
    }
  }
  return {
    Identify,
    flush: vi.fn(),
    getUserId: vi.fn(),
    identify: vi.fn(),
    init: vi.fn(),
    setDeviceId: vi.fn(),
    track: vi.fn(),
  }
})

describe('analytics.web', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Amplitude attaches the user-property values in effect when an event is queued, so the
  // $identify for a property has to be queued before any event that should carry it.
  it('queues $identify for user properties before a track() issued right after them', () => {
    analytics.setUserProperty('is_iframed', true)
    analytics.setUserProperty('iframe_parent_origin', 'https://dexscreener.com')
    analytics.sendEvent(SharedEventName.APP_LOADED, { is_iframed: true })
    analytics.sendEvent(SharedEventName.PAGE_VIEWED, { page: '/swap' })

    const identifyCalls = vi.mocked(identify).mock.invocationCallOrder
    const trackCalls = vi.mocked(track).mock.invocationCallOrder
    expect(identifyCalls).toHaveLength(2)
    expect(trackCalls).toHaveLength(2)
    expect(Math.max(...identifyCalls)).toBeLessThan(Math.min(...trackCalls))
    expect(vi.mocked(track).mock.calls[0]?.[0]).toBe(SharedEventName.APP_LOADED)
  })

  it('does not yield before calling identify()', () => {
    analytics.setUserProperty('is_iframed', false)
    expect(identify).toHaveBeenCalledTimes(1)
  })
})
