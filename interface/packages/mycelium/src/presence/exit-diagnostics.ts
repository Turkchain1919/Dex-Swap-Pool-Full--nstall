import { Fragment } from 'react'
import { isDevelopmentBuild } from '../compat/dev-build'

/** Matched by the exit-lane test helper (./testing/presence-exit-lane) to fail a test on a mis-wired child. */
export const PRESENCE_EXIT_DEFECT_WARNING_PREFIX = 'Presence exit defect:'

const reported = new Set<string>()

/**
 * Not the shared compat warner: that gates on `isTestEnv()`, which an observable exit must stub
 * false. Callers prefix `dedupeKey` with their `Presence` instance id — child keys are not unique
 * across instances (an unkeyed child is always `presence-0`), so without it the first mis-wired
 * call site on the page silences every other one.
 */
function warnOnce(dedupeKey: string, message: string): void {
  if (!isDevelopmentBuild() || reported.has(dedupeKey)) {
    return
  }
  reported.add(dedupeKey)
  // oxlint-disable-next-line no-console -- dev/test-only diagnostic; these defects are otherwise entirely silent
  console.warn(`${PRESENCE_EXIT_DEFECT_WARNING_PREFIX} ${message}`)
}

function describeChildType(type: unknown): string {
  if (typeof type === 'string') {
    return type
  }
  if (typeof type === 'symbol') {
    return type.description ?? 'symbol'
  }
  if (typeof type === 'function' || (typeof type === 'object' && type !== null)) {
    const named = type as { displayName?: unknown; name?: unknown }
    if (typeof named.displayName === 'string' && named.displayName !== '') {
      return named.displayName
    }
    if (typeof named.name === 'string' && named.name !== '') {
      return named.name
    }
  }
  return 'unknown'
}

/** Called from the commit, not render, so the report survives a discarded render. */
export function reportFragmentChildren(children: Iterable<[string, { type: unknown }]>, instanceId: string): void {
  for (const [key, element] of children) {
    if (element.type === Fragment) {
      warnOnce(
        `${instanceId} fragment ${key}`,
        `the child at key "${key}" is a Fragment, which takes no ref, so its exit can never run. ` +
          'Give Presence the element that carries the exit animation, not a Fragment wrapping it.',
      )
    }
  }
}

export function reportUnobservableExit({
  element,
  key,
  node,
  instantLane,
  instanceId,
}: {
  element: { type: unknown; props: { animatePresence?: boolean } }
  key: string
  node: HTMLElement | undefined
  instantLane: boolean
  instanceId: string
}): void {
  if (node !== undefined || instantLane || element.props.animatePresence === false) {
    return
  }
  const name = describeChildType(element.type)
  warnOnce(
    `${instanceId} no-node ${name} ${key}`,
    `<${name}> (key "${key}") never resolved its forwarded ref to a DOM node, so it unmounted instantly with no exit animation. ` +
      'Forward the ref to the element the exit animation is on, or pass animatePresence={false} to opt out of the exit hold.',
  )
}

export function reportMissingExitAnimation({
  type,
  key,
  className,
  instanceId,
}: {
  type: unknown
  key: string
  className: string
  instanceId: string
}): void {
  const name = describeChildType(type)
  warnOnce(
    `${instanceId} no-animation ${name} ${key}`,
    `no exit animation resolved for <${name}> (key "${key}"), so it unmounted instantly with no exit animation. ` +
      'Give the child an exit preset (animateExit, or an EXIT_PRESET_CLASSES entry, which emit data-exiting:animate-spore-exit-* classes), ' +
      `or pass animatePresence={false} to opt out of the exit hold. Class list on the node: "${className}".`,
  )
}

export function resetPresenceExitDefectReports(): void {
  reported.clear()
}
