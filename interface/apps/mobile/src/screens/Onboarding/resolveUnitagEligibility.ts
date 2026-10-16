import { ONE_SECOND_MS } from 'utilities/src/time/time'
import { promiseTimeout } from 'utilities/src/time/timing'

// Must outlive the session gate's cold-start budget (`DEFAULT_READY_TIMEOUT_MS`, 10s, in
// @universe/sessions) so a slow bootstrap is not mistaken for ineligibility.
export const UNITAG_ELIGIBILITY_TIMEOUT_MS = 15 * ONE_SECOND_MS

export type UnitagEligibilityResolution =
  | { status: 'resolved'; canClaim: boolean }
  | { status: 'timeout' }
  | { status: 'error'; error: unknown }

export async function resolveUnitagEligibility(
  resolveCanClaimUnitag: () => Promise<boolean>,
  timeoutMs = UNITAG_ELIGIBILITY_TIMEOUT_MS,
): Promise<UnitagEligibilityResolution> {
  try {
    const canClaim = await promiseTimeout(resolveCanClaimUnitag(), timeoutMs)

    return canClaim === null ? { status: 'timeout' } : { status: 'resolved', canClaim }
  } catch (error) {
    return { status: 'error', error }
  }
}
