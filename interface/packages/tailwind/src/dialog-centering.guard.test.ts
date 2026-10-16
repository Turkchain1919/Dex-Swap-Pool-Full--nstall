import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `.dialog-content` is positioned with `left: 50%; top: 50%`, so it is only
 * actually centred once a -50%/-50% translate is applied. That translate used to
 * live exclusively inside the dialog-appear/dialog-hide keyframes, held in place
 * by `animation-fill-mode: forwards` — which means any path where the animation
 * does not run (prefers-reduced-motion, a consumer overriding `animation`, a
 * missing keyframe) rendered the dialog offset by half its own size.
 *
 * It now sits on the element via the `translate` property, so the keyframes'
 * transform composes on top instead of owning the centring. This guard keeps it
 * there — including for the two app-local copies of the class
 * (apps/dev-portal base-modal, mission-control UploadDrawer).
 */
const animationsCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../css/animations.css'), 'utf8')

function ruleBody(selector: string): string {
  const start = animationsCss.indexOf(`${selector} {`)
  expect(start, `${selector} rule not found`).toBeGreaterThan(-1)
  return animationsCss.slice(start, animationsCss.indexOf('}', start))
}

function keyframesBody(name: string): string {
  const start = animationsCss.indexOf(`@keyframes ${name} {`)
  expect(start, `@keyframes ${name} not found`).toBeGreaterThan(-1)
  // Keyframe blocks nest one level, so close on the second following '}' pair.
  const end = animationsCss.indexOf('\n}', start)
  return animationsCss.slice(start, end)
}

describe('.dialog-content centring is not animation-dependent', () => {
  it('carries the centring translate on the element itself', () => {
    expect(ruleBody('.dialog-content')).toContain('translate: -50% -50%')
  })

  it('uses the `translate` property, not `transform`, so keyframes compose', () => {
    expect(ruleBody('.dialog-content')).not.toContain('transform:')
  })

  it.each(['dialog-appear', 'dialog-hide'])('%s no longer carries the centring transform', (name) => {
    expect(keyframesBody(name)).not.toContain('-50%')
  })

  it.each(['dialog-appear', 'dialog-hide'])('%s still animates the 4px nudge', (name) => {
    expect(keyframesBody(name)).toContain('translateY(4px)')
  })
})
