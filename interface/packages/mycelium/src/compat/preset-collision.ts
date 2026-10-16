/**
 * The animation preset/longhand collision guard.
 *
 * The enter/exit preset classes declare the CSS animation SHORTHAND, so an
 * animation longhand anywhere on the same element hits the cascade inversion
 * the long tail excludes the shorthand spelling to avoid: both classes ship,
 * and stylesheet order — not JSX prop order — decides whether the preset
 * resets the longhands or the longhands break the preset. Development
 * semantics throw so the mix is fixed before it ships; production builds keep
 * both classes — a render must never crash over a mis-ordered animation —
 * and warn once per prop/pool pair, BOUNDED like the out-of-set set: group
 * pool keys interpolate caller-chosen group names, so the pair domain is not
 * static.
 *
 * Pseudo pools stay guarded DELIBERATELY: their variant would actually win
 * the cascade deterministically (class + pseudo-class outranks the preset's
 * lone class), but the emission lane cannot express a variant-prefixed
 * animation longhand today — the family has base-tier var twins only, so a
 * pseudo/media/theme animation class is out-of-set and unrenderable
 * regardless of the preset (`animation-long-tail.test.ts` pins the gap).
 * Revisit the pseudo exemption when the animation family joins the curated
 * variant twin tier.
 */
import { isDevelopmentBuild, MAX_DEDUPED_DIAGNOSTICS } from './dev-semantics'
import { ANIMATION_LONG_TAIL_PROPS } from './style-props'

export function checkAnimationPresetCollision(style: object, pool: string): void {
  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined && ANIMATION_LONG_TAIL_PROPS.has(key)) {
      reportAnimationPresetCollision(key, pool)
    }
  }
}

function presetCollisionMessage(key: string, pool: string): string {
  return (
    `compat: ${key} (${pool} pool) cannot combine with an animateEnter/animateExit/animateEnterExit preset — ` +
    'the preset class declares the CSS animation shorthand, so stylesheet order (not JSX prop order) would ' +
    'decide between it and the longhand; use either the preset or the longhands on one element'
  )
}

let warnedPresetCollisions = new Set<string>()
let presetCollisionSuppressionAnnounced = false

/** Test hook: reset the collision warn-dedupe state (compose's `resetOutOfSetWarnings` calls this). */
export function resetPresetCollisionWarnings(): void {
  warnedPresetCollisions = new Set()
  presetCollisionSuppressionAnnounced = false
}

function reportAnimationPresetCollision(key: string, pool: string): void {
  if (isDevelopmentBuild()) {
    throw new Error(presetCollisionMessage(key, pool))
  }
  const dedupeKey = `${pool}.${key}`
  if (warnedPresetCollisions.has(dedupeKey)) {
    return
  }
  if (warnedPresetCollisions.size >= MAX_DEDUPED_DIAGNOSTICS) {
    if (!presetCollisionSuppressionAnnounced) {
      presetCollisionSuppressionAnnounced = true
      // oxlint-disable-next-line no-console -- production-only diagnostic; the dev build throws instead
      console.warn(
        `compat: ${MAX_DEDUPED_DIAGNOSTICS} distinct preset/longhand collisions warned — further warnings suppressed.`,
      )
    }
    return
  }
  warnedPresetCollisions.add(dedupeKey)
  // oxlint-disable-next-line no-console -- production-only diagnostic; the dev build throws instead
  console.warn(presetCollisionMessage(key, pool))
}
