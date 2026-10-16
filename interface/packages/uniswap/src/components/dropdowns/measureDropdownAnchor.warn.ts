import { logger } from 'utilities/src/logger/logger'

/**
 * The dropdown only opens from inside the measurement callback, so a mounted ref that does not
 * expose the expected measurement API makes the toggle silently inert. Log it: the web lane's
 * equivalent regression threw and was findable, whereas this guard would swallow it. A null ref is
 * the ordinary not-yet-attached case and stays quiet.
 */
let hasWarned = false

export function warnUnmeasurableAnchor(leg: 'web' | 'native', api: string): void {
  // The resize listener shares this measure path with the open path, so an unmeasurable ref would
  // otherwise log on every resize event. One report is all the signal is worth.
  if (hasWarned) {
    return
  }
  hasWarned = true
  logger.warn(
    'measureDropdownAnchor',
    'measureDropdownAnchor',
    `Dropdown anchor ref on the ${leg} leg has no ${api}; the dropdown cannot open`,
  )
}
