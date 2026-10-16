import { FetchError, type BlockaidScanTransactionResponse } from '@universe/api'
import { logger } from 'utilities/src/logger/logger'
import {
  BlockaidScanUnusableError,
  getScanFailureState,
  requireUsableScan,
} from 'wallet/src/features/dappRequests/utils/blockaidScanQuery'

type TransactionValidation = NonNullable<BlockaidScanTransactionResponse['validation']>
type SuccessfulValidation = Extract<TransactionValidation, { status: 'Success' }>

function createSuccessfulValidation(
  overrides: Partial<Omit<SuccessfulValidation, 'status'>> = {},
): SuccessfulValidation {
  return {
    status: 'Success',
    result_type: 'Benign',
    description: '',
    reason: '',
    classification: '',
    features: [],
    ...overrides,
  }
}

function createScanResponse({
  validation,
  simulation = { status: 'Error', error: 'simulation failed' },
}: {
  validation?: TransactionValidation
  simulation?: BlockaidScanTransactionResponse['simulation']
} = {}): BlockaidScanTransactionResponse {
  return {
    block: '1',
    chain: 'ethereum',
    validation,
    simulation,
  }
}

describe('getScanFailureState', () => {
  it('fails closed as permanent when scanning is disabled (never attempted)', () => {
    // A scan that never ran produced no verdict, and the un-buildable request is request-shaped, so it
    // gates behind an acknowledgement rather than leaving confirmation ungated.
    expect(getScanFailureState({ error: null, hasUsableScan: false, isScanEnabled: false, isPaused: false })).toEqual({
      hasScanFailed: true,
      isScanFailurePermanent: true,
    })
  })

  it('does not fail while an enabled scan is active', () => {
    expect(getScanFailureState({ error: null, hasUsableScan: false, isScanEnabled: true, isPaused: false })).toEqual({
      hasScanFailed: false,
      isScanFailurePermanent: false,
    })
  })

  it('fails closed when an enabled scan is paused without a usable result', () => {
    expect(getScanFailureState({ error: null, hasUsableScan: false, isScanEnabled: true, isPaused: true })).toEqual({
      hasScanFailed: true,
      isScanFailurePermanent: false,
    })
  })

  it('preserves permanent scan failures', () => {
    const error = new BlockaidScanUnusableError({
      reason: 'validation_error',
      isPermanent: true,
      failureKind: 'validation',
    })

    expect(getScanFailureState({ error, hasUsableScan: false, isScanEnabled: true, isPaused: false })).toEqual({
      hasScanFailed: true,
      isScanFailurePermanent: true,
    })
  })

  it('fails closed as permanent for an unexpected query error', () => {
    expect(
      getScanFailureState({
        error: new Error('unexpected query failure'),
        hasUsableScan: false,
        isScanEnabled: true,
        isPaused: false,
      }),
    ).toEqual({
      hasScanFailed: true,
      isScanFailurePermanent: true,
    })
  })

  it('preserves a known transient scan failure', () => {
    const error = new BlockaidScanUnusableError({
      reason: 'transport_error',
      isPermanent: false,
      failureKind: 'transport',
    })

    expect(getScanFailureState({ error, hasUsableScan: false, isScanEnabled: true, isPaused: false })).toEqual({
      hasScanFailed: true,
      isScanFailurePermanent: false,
    })
  })

  it('surfaces a required simulation failure as a permanent scan failure', () => {
    // A simulation failure is request-shaped (attacker-inducible), so it is classified permanent and
    // gated behind an acknowledgement, not treated as an ungated blip.
    const error = new BlockaidScanUnusableError({
      reason: 'simulation_error',
      isPermanent: true,
      failureKind: 'simulation',
    })

    expect(getScanFailureState({ error, hasUsableScan: false, isScanEnabled: true, isPaused: false })).toEqual({
      hasScanFailed: true,
      isScanFailurePermanent: true,
    })
  })

  it('keeps a cached usable verdict when a background refetch fails', () => {
    const error = new BlockaidScanUnusableError({
      reason: 'validation_error',
      isPermanent: true,
      failureKind: 'validation',
    })

    expect(getScanFailureState({ error, hasUsableScan: true, isScanEnabled: true, isPaused: false })).toEqual({
      hasScanFailed: false,
      isScanFailurePermanent: false,
    })
  })
})

describe('requireUsableScan', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // A 5xx is permanent (fail closed): a deterministic input-triggered 500 is indistinguishable from an
  // outage, and Blockaid gives no guarantee that adversarial failures return 4xx, so it must gate.
  it('logs a rejected 5xx and classifies it as a permanent scan failure', async () => {
    const transportError = new FetchError({ response: { status: 503 } as Response })
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        scan: async () => {
          throw transportError
        },
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({
      cause: transportError,
      failureKind: 'transport',
      isPermanent: true,
      message: expect.stringContaining('server_error'),
    })
    expect(warnSpy).toHaveBeenCalledWith(
      'blockaidScanQuery',
      'requireUsableScan',
      'Blockaid scan request failed, blocking confirmation',
      expect.objectContaining({
        failureKind: 'transport',
        httpStatus: 503,
        isPermanent: true,
        scanType: 'transaction',
      }),
    )
  })

  it('classifies an HTTP 413 as permanently unscannable', async () => {
    const fetchError = new FetchError({ response: { status: 413 } as Response })
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        scan: async () => {
          throw fetchError
        },
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({
      cause: fetchError,
      failureKind: 'validation',
      isPermanent: true,
      message: expect.stringContaining('request_too_large'),
    })
    expect(warnSpy).toHaveBeenCalledWith(
      'blockaidScanQuery',
      'requireUsableScan',
      'Blockaid scan request failed, blocking confirmation',
      expect.objectContaining({ failureKind: 'validation', httpStatus: 413, isPermanent: true }),
    )
  })

  // A timeout is dapp-inducible (a request crafted to exceed the 5s scan timeout, re-sent), so it is
  // classified permanent — the acknowledgement-gated path — rather than an ungated transient caution.
  it('classifies a timed-out scan as permanent and labels it distinctly from other transport failures', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        scan: async () => {
          throw abortError
        },
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({
      failureKind: 'transport',
      isPermanent: true,
      reason: 'timeout',
    })
  })

  // A deterministic 4xx rejection (e.g. 400) is request-shaped: the same request is always rejected, so
  // an attacker could re-send one to reliably reach an ungated caution — hence permanent.
  it('classifies a deterministic 4xx HTTP rejection as permanent', async () => {
    const fetchError = new FetchError({ response: { status: 400 } as Response })
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        scan: async () => {
          throw fetchError
        },
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({ failureKind: 'validation', isPermanent: true, reason: 'request_rejected' })
  })

  // 429 is dapp-influenceable (a dapp can trip the rate limit by volume), so it is classified permanent
  // (reason 'rate_limited') — otherwise flooding requests could force an ungated caution on a malicious one.
  it('classifies a 429 rate-limit as permanent', async () => {
    const fetchError = new FetchError({ response: { status: 429 } as Response })
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        scan: async () => {
          throw fetchError
        },
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({ failureKind: 'transport', isPermanent: true, reason: 'rate_limited' })
  })

  // A rejection with no HTTP status is a connection-level blip (DNS/TLS/offline), not request-shaped and
  // not dapp-aimable — the ONLY rejection that stays transient (every HTTP status now fails closed).
  it('keeps a connection-level rejection with no HTTP status transient', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        scan: async () => {
          throw new Error('network down')
        },
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({ failureKind: 'transport', isPermanent: false, reason: 'transport_error' })
  })

  // A non-benign verdict from a completed validation must survive a failed (required) simulation,
  // otherwise a known-malicious request whose simulation reverts is downgraded to a soft caution.
  it('surfaces a malicious validation verdict even when the required simulation fails', async () => {
    const response = createScanResponse({
      validation: createSuccessfulValidation({ result_type: 'Malicious' }),
    })

    await expect(requireUsableScan({ scan: async () => response, scanType: 'transaction' })).resolves.toBe(response)
  })

  // The malicious signal can live in features[]/classification while result_type reads Benign; the
  // non-benign check must see those legs too, so this verdict also survives a failed simulation.
  it('surfaces a malicious features verdict under a benign result_type when simulation fails', async () => {
    const response = createScanResponse({
      validation: createSuccessfulValidation({
        features: [{ type: 'Malicious', feature_id: 'malicious_feature', description: 'Malicious behavior' }],
      }),
    })

    await expect(requireUsableScan({ scan: async () => response, scanType: 'transaction' })).resolves.toBe(response)
  })

  // A benign validation whose required simulation fails is request-shaped (the dapp controls whether
  // execution can be simulated), so it is classified permanent — the acknowledgement-gated path — not an
  // ungated blip.
  it('blocks a benign request whose required simulation fails, classified permanent', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        scan: async () => createScanResponse({ validation: createSuccessfulValidation() }),
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({ failureKind: 'simulation', isPermanent: true, reason: 'simulation_error' })
  })

  // A softer Warning verdict whose required simulation fails has no usable preview, and simulation
  // success is dapp-controllable — so it must fail closed (permanent gate) rather than surface as an
  // ungated Warning. Only a Critical (malicious) verdict survives a failed simulation.
  it('blocks a Warning verdict whose required simulation fails, classified permanent', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        scan: async () => createScanResponse({ validation: createSuccessfulValidation({ result_type: 'Warning' }) }),
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({ failureKind: 'simulation', isPermanent: true, reason: 'simulation_error' })
  })

  // A resolved-but-unusable scan is request-shaped and recurs on retry, so every shape is permanent: an
  // attacker must not be able to craft a request that lands here yet reaches an ungated caution. Only a
  // rejected transport with no request-shaped signal (throwRejectedScan) stays transient.
  it.each<[string, unknown, string]>([
    ['a null (schema-invalid) response', null, 'no_response'],
    ['a response missing validation', createScanResponse(), 'missing_validation'],
    [
      'a validation rejected with an unknown error code',
      createScanResponse({
        validation: {
          status: 'Error',
          result_type: '',
          description: '',
          reason: '',
          features: [],
          error: 'some_future_code',
        },
      }),
      'validation_error',
    ],
    [
      'a deliberately malformed validation rejected with no error code',
      { block: '1', chain: 'ethereum', validation: { status: 'Error' } },
      'validation_error',
    ],
  ])('classifies %s as a permanent failure', async (_label, response, reason) => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)

    await expect(
      requireUsableScan({
        // The final table row deliberately bypasses the API schema to verify defense-in-depth behavior.
        scan: async () => response as BlockaidScanTransactionResponse | null,
        scanType: 'transaction',
      }),
    ).rejects.toMatchObject({ isPermanent: true, reason })
  })
})
