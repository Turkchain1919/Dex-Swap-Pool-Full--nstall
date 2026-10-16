import { call } from 'typed-redux-saga'
import { ExtensionEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { createMonitoredSaga } from 'uniswap/src/utils/saga'
import { logger } from 'utilities/src/logger/logger'
import { LockParams } from 'wallet/src/features/auth/types'
import { Keyring } from 'wallet/src/features/wallet/Keyring/Keyring'

// Lock only. Unlock is `unlockWallet`, a plain function: a dispatched action reaches every middleware,
// enhancer and telemetry sink, so the password must never travel on one.
// oxlint-disable-next-line typescript/explicit-function-return-type
function* auth(_params: LockParams) {
  logger.debug('authSaga', 'auth', `Using monitored auth saga`)
  yield* call(lock)
}

// oxlint-disable-next-line typescript/explicit-function-return-type
function* lock() {
  logger.debug('authSaga', 'lock', `Locking wallet`)
  yield* call(Keyring.lock)
  yield* call(sendAnalyticsEvent, ExtensionEventName.ChangeLockedState, {
    locked: true,
    location: 'sidebar',
  })
}

export const {
  name: authSagaName,
  wrappedSaga: authSaga,
  reducer: authReducer,
  actions: authActions,
} = createMonitoredSaga({
  saga: auth,
  name: 'auth',
  options: { showErrorNotification: false },
})
