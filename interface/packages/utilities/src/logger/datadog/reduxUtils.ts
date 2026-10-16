import { createScrubber, DEFAULT_REDACT_PATHS, DEFAULT_SCRUB_PATTERNS } from '@universe/privacy'
import { Action } from 'redux'

type GenericReduxState = Record<string, unknown>

// The remaining DEFAULT_SCRUB_PATTERNS either rewrite ordinary swap data or backtrack on calldata hex.
export const ACTION_SCRUB_PATTERNS = DEFAULT_SCRUB_PATTERNS.filter((p) => p.name === 'jwt' || p.name === 'api_key')

// Wallet secrets, absent from DEFAULT_REDACT_PATHS and worse to leak than a password.
const ACTION_REDACT_PATHS = [
  ...DEFAULT_REDACT_PATHS,
  '**.mnemonic',
  '**.seedPhrase',
  '**.seed_phrase',
  '**.recoveryPhrase',
  '**.privateKey',
]

// Module scope: createScrubber precomputes its matchers, and this runs on every dispatch.
const scrubActionPayload = createScrubber({ patterns: ACTION_SCRUB_PATTERNS, redactPaths: ACTION_REDACT_PATHS })

/** `type` and `payload` keep the raw action's field names so existing RUM facets keep resolving. */
export function getRedactedReduxActionContext(action: Action<unknown> & { payload?: unknown }): {
  type: string
  payload?: unknown
  payloadScrubFailed?: true
} {
  const type = String(action.type)

  try {
    const { payload } = scrubActionPayload({ payload: action.payload })

    return { type, payload }
  } catch {
    // A throw here escapes the reducer and fails the dispatch, not just the telemetry.
    return { type, payloadScrubFailed: true }
  }
}

export function handleReduxAction({ newState, shouldLogState }: { shouldLogState: boolean; newState: unknown }): {
  shouldLogAction: boolean
  reduxStateToLog: GenericReduxState | undefined
} {
  // The consent result gates the action event, not just the state blob.
  const shouldLogAction = shouldLogState

  if (!shouldLogState) {
    return { shouldLogAction, reduxStateToLog: undefined }
  }

  const stateIsObject = typeof newState === 'object' && newState !== null
  const allObjectKeysString = stateIsObject && Object.keys(newState).every((k) => typeof k === 'string')
  const validState = stateIsObject && allObjectKeysString

  return {
    reduxStateToLog: validState ? filterReduxState(newState as GenericReduxState) : undefined,
    shouldLogAction,
  }
}

const ALLOWED_REDUX_FIELDS: string[] = [
  // Uniswap
  'searchHistory',
  'transactions',
  'uniswapBehaviorHistory',
  'userSettings',
  // Wallet
  'appearanceSettings',
  'behaviorHistory',
  'wallet',
  // Mobile
  'biometricSettings',
  'cloudBackup',
  // Extension
  'dappRequests',
  // Web
  'user',
]

// Filter redux state to reduce size where possible to needed information only
function filterReduxState(state: GenericReduxState | undefined): GenericReduxState {
  if (state === undefined) {
    return {}
  }

  return Object.keys(state).reduce((filteredState, key: string) => {
    if (ALLOWED_REDUX_FIELDS.includes(key)) {
      filteredState[key] = state[key]
    }
    return filteredState
  }, {} as GenericReduxState)
}
