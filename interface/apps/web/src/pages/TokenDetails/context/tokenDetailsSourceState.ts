export enum TokenDetailsSourceState {
  /** The source lookup is disabled or ineligible for this route. */
  Disabled = 'disabled',
  /** The source lookup has not settled yet. */
  Loading = 'loading',
  /** The source lookup returned data. */
  Found = 'found',
  /** The source lookup settled without data. */
  NotFound = 'not-found',
  /** The source lookup failed. */
  Error = 'error',
}
