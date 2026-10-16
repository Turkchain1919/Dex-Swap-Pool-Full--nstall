import { createStore } from 'redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const addAction = vi.fn()
const addError = vi.fn()

vi.mock('@datadog/browser-rum', () => ({
  datadogRum: {
    addAction: (...args: unknown[]) => addAction(...args),
    addError: (...args: unknown[]) => addError(...args),
  },
}))

vi.mock('@universe/environment', () => ({
  isExtensionApp: true,
  isWebApp: false,
  isTestEnv: (): boolean => false,
}))

const { createDatadogReduxEnhancer, logErrorToDatadog } = await import('utilities/src/logger/datadog/Datadog.web')

const UNLOCK_ACTION = {
  type: 'auth/trigger',
  payload: {
    type: 'Unlock',
    password: 'dummy-password',
    request: { retry: { attempt: 2, password: 'dummy-password' } },
    chainId: 1,
    requestId: 'req-42',
  },
}

const REDACTED_UNLOCK_PAYLOAD = {
  type: 'Unlock',
  password: '[REDACTED]',
  request: { retry: { attempt: 2, password: '[REDACTED]' } },
  chainId: 1,
  requestId: 'req-42',
}

function dispatchWithConsent(allowAnalytics: boolean, action: { type: string }): void {
  const enhancer = createDatadogReduxEnhancer({ shouldLogReduxState: () => allowAnalytics })
  const store = createStore((state: { wallet: object } = { wallet: {} }) => state, undefined, enhancer)
  store.dispatch(action)
}

function unlockActionContext(): { type: string; payload?: unknown; payloadScrubFailed?: true } | undefined {
  return addAction.mock.calls.find(([name]) => name === 'Redux Action: auth/trigger')?.[1] as
    | { type: string; payload?: unknown; payloadScrubFailed?: true }
    | undefined
}

describe('createDatadogReduxEnhancer (web)', () => {
  beforeEach(() => {
    addAction.mockClear()
    addError.mockClear()
  })

  it('redacts the payload and leaves the action type intact', () => {
    dispatchWithConsent(true, UNLOCK_ACTION)

    expect(unlockActionContext()).toEqual({ type: 'auth/trigger', payload: REDACTED_UNLOCK_PAYLOAD })
  })

  it('redacts a password several levels deep in the payload', () => {
    dispatchWithConsent(true, UNLOCK_ACTION)

    const payload = unlockActionContext()?.payload as { request: { retry: { password: string } } }
    expect(payload.request.retry.password).toBe('[REDACTED]')
    expect(JSON.stringify(addAction.mock.calls)).not.toContain('dummy-password')
  })

  it('keeps non-sensitive payload fields', () => {
    dispatchWithConsent(true, UNLOCK_ACTION)

    const payload = unlockActionContext()?.payload as {
      type: string
      chainId: number
      requestId: string
      request: { retry: { attempt: number } }
    }
    expect(payload.type).toBe('Unlock')
    expect(payload.chainId).toBe(1)
    expect(payload.requestId).toBe('req-42')
    expect(payload.request.retry.attempt).toBe(2)
  })

  it('completes the dispatch and degrades to type-only when the payload throws', () => {
    const payload = {}
    Object.defineProperty(payload, 'hostile', {
      get() {
        throw new Error('getter blew up')
      },
      enumerable: true,
    })
    const enhancer = createDatadogReduxEnhancer({ shouldLogReduxState: () => true })
    const store = createStore((state: { wallet: object } = { wallet: {} }) => state, undefined, enhancer)

    expect(() => store.dispatch({ type: 'auth/trigger', payload })).not.toThrow()
    expect(store.getState()).toEqual({ wallet: {} })
    expect(unlockActionContext()).toEqual({ type: 'auth/trigger', payloadScrubFailed: true })
  })

  it('sends no action event when analytics are not allowed', () => {
    dispatchWithConsent(false, UNLOCK_ACTION)

    expect(addAction).not.toHaveBeenCalled()
  })

  it('drops the cached state snapshot when consent is withdrawn mid-session', () => {
    let allowAnalytics = true
    const enhancer = createDatadogReduxEnhancer({ shouldLogReduxState: () => allowAnalytics })
    const store = createStore(
      (state: { transactions: object } = { transactions: { pending: [] } }) => state,
      undefined,
      enhancer,
    )
    const context = { tags: { file: 'test', function: 'test' } }

    store.dispatch({ type: 'session/warm' })
    logErrorToDatadog(new Error('while opted in'), context)
    expect(addError.mock.calls.at(-1)?.[1]).toEqual({ ...context, reduxState: { transactions: { pending: [] } } })

    allowAnalytics = false
    store.dispatch({ type: 'telemetry/setAllowAnalytics' })
    logErrorToDatadog(new Error('after opt-out'), context)
    expect(addError.mock.calls.at(-1)?.[1]).toEqual({ ...context, reduxState: undefined })
  })
})
