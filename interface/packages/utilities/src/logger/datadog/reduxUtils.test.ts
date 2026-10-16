import {
  ACTION_SCRUB_PATTERNS,
  getRedactedReduxActionContext,
  handleReduxAction,
} from 'utilities/src/logger/datadog/reduxUtils'
import { describe, expect, it } from 'vitest'

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

describe('getRedactedReduxActionContext', () => {
  it('reports the action type verbatim under the key RUM facets already use', () => {
    expect(getRedactedReduxActionContext(UNLOCK_ACTION).type).toBe('auth/trigger')
  })

  it('redacts a password at the top level of the payload and several levels deep', () => {
    const { payload } = getRedactedReduxActionContext(UNLOCK_ACTION)

    expect(payload).toEqual({
      type: 'Unlock',
      password: '[REDACTED]',
      request: { retry: { attempt: 2, password: '[REDACTED]' } },
      chainId: 1,
      requestId: 'req-42',
    })
    expect(JSON.stringify(payload)).not.toContain('dummy-password')
  })

  it('redacts the other credential-shaped keys the scrubber covers', () => {
    const { payload } = getRedactedReduxActionContext({
      type: 'session/refresh',
      payload: { secret: 'x', credentials: { token: 'y' }, authorization: 'Bearer z', keep: 'me' },
    })

    expect(payload).toEqual({
      secret: '[REDACTED]',
      credentials: '[REDACTED]',
      authorization: '[REDACTED]',
      keep: 'me',
    })
  })

  it('redacts a jwt-shaped value even in an unremarkable field', () => {
    const { payload } = getRedactedReduxActionContext({
      type: 'session/refresh',
      payload: { auth: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkdW1teSJ9.dummySignatureValue' },
    })

    expect(payload).toEqual({ auth: '[JWT_REDACTED]' })
  })

  it('leaves an address-shaped value alone so the payload stays useful', () => {
    const { payload } = getRedactedReduxActionContext({
      type: 'transactions/addTransaction',
      payload: { from: '0xAAAA44272dc658575Ba38f43C438447dDED45358', chainId: 1 },
    })

    expect(payload).toEqual({ from: '0xAAAA44272dc658575Ba38f43C438447dDED45358', chainId: 1 })
  })

  it('handles an action with no payload', () => {
    expect(getRedactedReduxActionContext({ type: 'telemetry/setAllowAnalytics' })).toEqual({
      type: 'telemetry/setAllowAnalytics',
      payload: undefined,
    })
  })

  it('redacts wallet secrets nested in the payload', () => {
    const { payload } = getRedactedReduxActionContext({
      type: 'wallet/import',
      payload: {
        account: { backup: { mnemonic: 'dummy words', recoveryPhrase: 'dummy words', privateKey: '0xdummy' } },
        mnemonicId: '0xAAAA44272dc658575Ba38f43C438447dDED45358',
      },
    })

    expect(payload).toEqual({
      account: { backup: { mnemonic: '[REDACTED]', recoveryPhrase: '[REDACTED]', privateKey: '[REDACTED]' } },
      mnemonicId: '0xAAAA44272dc658575Ba38f43C438447dDED45358',
    })
  })

  it('redacts wallet secrets inside arrays', () => {
    const { payload } = getRedactedReduxActionContext({
      type: 'wallet/import',
      payload: { accounts: [{ mnemonic: 'dummy words', address: '0xabc' }] },
    })

    expect(payload).toEqual({ accounts: [{ mnemonic: '[REDACTED]', address: '0xabc' }] })
  })

  it('redacts an api-key-shaped value', () => {
    const { payload } = getRedactedReduxActionContext({
      type: 'session/refresh',
      payload: { note: 'api_key: abcdefghijklmnopqrstuvwxyz0123456789' },
    })

    expect(payload).toEqual({ note: '[API_KEY_REDACTED]' })
  })

  it('falls back to type-only when the payload throws during traversal', () => {
    const payload = {}
    Object.defineProperty(payload, 'hostile', {
      get() {
        throw new Error('getter blew up')
      },
      enumerable: true,
    })

    expect(getRedactedReduxActionContext({ type: 'auth/trigger', payload })).toEqual({
      type: 'auth/trigger',
      payloadScrubFailed: true,
    })
  })
})

describe('ACTION_SCRUB_PATTERNS', () => {
  it('selects exactly the patterns it means to', () => {
    expect(ACTION_SCRUB_PATTERNS.map((p) => p.name)).toEqual(['jwt', 'api_key'])
  })

  it('does not mutate the dispatched action', () => {
    const action = { type: 'auth/trigger', payload: { password: 'dummy-password' } }

    getRedactedReduxActionContext(action)

    expect(action.payload.password).toBe('dummy-password')
  })
})

describe('handleReduxAction', () => {
  it('allows the action event when analytics are allowed', () => {
    const { shouldLogAction } = handleReduxAction({
      newState: {},
      shouldLogState: true,
    })

    expect(shouldLogAction).toBe(true)
  })

  it('blocks the action event when analytics are not allowed', () => {
    const { shouldLogAction, reduxStateToLog } = handleReduxAction({
      newState: { wallet: { accounts: {} } },
      shouldLogState: false,
    })

    expect(shouldLogAction).toBe(false)
    expect(reduxStateToLog).toBeUndefined()
  })

  it('keeps only allowlisted fields in the logged state', () => {
    const { reduxStateToLog } = handleReduxAction({
      newState: {
        wallet: { accounts: {} },
        transactions: { pending: [] },
        passwordCache: { password: 'dummy-password' },
        notAllowlisted: { anything: true },
      },
      shouldLogState: true,
    })

    expect(reduxStateToLog).toEqual({ wallet: { accounts: {} }, transactions: { pending: [] } })
  })

  it('returns no state to log for a non-object state', () => {
    const { reduxStateToLog } = handleReduxAction({
      newState: 'not-an-object',
      shouldLogState: true,
    })

    expect(reduxStateToLog).toBeUndefined()
  })
})
