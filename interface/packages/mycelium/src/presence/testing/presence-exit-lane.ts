/* oxlint-disable no-console -- this helper swaps console.warn to escalate Presence's exit diagnostics into test failures */
/**
 * Un-blinds `Presence` exits for a consumer test suite: `Presence` finishes
 * removals synchronously under `isTestEnv()`, and jsdom applies no stylesheet,
 * so every node reports `animationName: 'none'`. Also escalates the dev exit
 * diagnostics into throws, so a mis-wired call site fails instead of logging.
 * Pair with `presenceExitsEnabledEnvironment`; see `exit-guarantee.test.tsx`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EXIT_ANIMATION_NAME_PREFIX } from '../../compat/animations'
import { PRESENCE_EXIT_DEFECT_WARNING_PREFIX, resetPresenceExitDefectReports } from '../exit-diagnostics'
import { PRESENCE_SKIP_ENTER_ATTR } from '../Presence.web'

const UTILITY_PREFIX = 'animate-'
const EXIT_UTILITY = `${UTILITY_PREFIX}${EXIT_ANIMATION_NAME_PREFIX}`
const ENTER_UTILITY = `${UTILITY_PREFIX}spore-enter-`

function classTokens(element: Element): string[] {
  const className = element.getAttribute('class')
  return className === null ? [] : className.split(/\s+/).filter((token) => token !== '')
}

/** Variant prefixes are not part of the keyframe name: `data-exiting:animate-spore-exit-fade-out` resolves to `spore-exit-fade-out`. */
function keyframeName(token: string): string {
  return token.slice(token.lastIndexOf(':') + 1).slice(UTILITY_PREFIX.length)
}

/**
 * Only a bare token is always-on. Stripping the variant prefix is right for reading a keyframe
 * name and wrong for deciding whether a rule applies: the ungated branches below model an
 * always-running class, so any prefix — an ancestor gate like `group-data-exiting/...`, a media
 * variant — must not be read as unconditional. An unmatched exit token falls through and leaves
 * Presence reporting a missing exit animation, which this lane escalates into a failure.
 */
function isUnconditional(token: string): boolean {
  return !token.includes(':')
}

const COMPAT_CSS_PATH = join(__dirname, '..', '..', '..', '..', 'tailwind', 'css', 'compat.css')

let definedKeyframes: Set<string> | undefined

/**
 * Resolving purely by class-name shape lets a typo'd exit class through: the token looks right, a
 * name comes back, and `Presence` holds waiting for an animation the browser would never start.
 * Checking the name against the stylesheet that has to define it closes that gap.
 */
function checkedKeyframeName(token: string): string {
  const name = keyframeName(token)
  if (definedKeyframes === undefined) {
    let css: string
    try {
      css = readFileSync(COMPAT_CSS_PATH, 'utf8')
    } catch (cause) {
      // COMPAT_CSS_PATH walks the filesystem layout to a sibling package; if compat.css moves, name
      // the file we looked for instead of surfacing a bare ENOENT far from the cause.
      throw new Error(
        `presence exit lane: could not read the compat stylesheet at ${COMPAT_CSS_PATH}. ` +
          `If @universe/tailwind moved css/compat.css, update COMPAT_CSS_PATH.`,
        { cause },
      )
    }
    definedKeyframes = new Set(Array.from(css.matchAll(/@keyframes\s+([\w-]+)/g), (match) => match[1] ?? ''))
  }
  if (!definedKeyframes.has(name)) {
    throw new Error(
      `presence exit lane: the class "${token}" resolves to keyframe "${name}", which ` +
        `${COMPAT_CSS_PATH} does not define. Fix the class name, or add the keyframe.`,
    )
  }
  return name
}

/**
 * Models the `@universe/tailwind/css/compat.css` cascade: exit utilities gated
 * behind `[data-exiting]`, bare enter utilities unconditional (reporting their
 * name even after playback), skip-enter suppressing the enter lane. A
 * variant-prefixed enter token is not always-on, so — symmetric with the exit
 * branch — it is not read as a running enter animation either.
 */
function resolveAnimationName(element: Element): string {
  const tokens = classTokens(element)
  // startsWith, not includes: only a leading `data-exiting:` self-gate is this element's own exit.
  // An ancestor gate (`group-data-exiting:`, `peer-data-exiting:`) embeds the same substring but
  // fires off another element's state, so matching it here would read an ancestor-gated exit as a
  // running self-exit. The named descendant form (`group-data-exiting/presence-child:`) already
  // fails this test and correctly falls through to the enter branch.
  const gatedExit = tokens.find((token) => token.startsWith(`data-exiting:${EXIT_UTILITY}`))
  if (gatedExit !== undefined && element.hasAttribute('data-exiting')) {
    return checkedKeyframeName(gatedExit)
  }
  const ungatedExit = tokens.find((token) => isUnconditional(token) && token.startsWith(EXIT_UTILITY))
  if (ungatedExit !== undefined) {
    return checkedKeyframeName(ungatedExit)
  }
  if (element.hasAttribute(PRESENCE_SKIP_ENTER_ATTR)) {
    return 'none'
  }
  const enter = tokens.find((token) => isUnconditional(token) && token.startsWith(ENTER_UTILITY))
  return enter === undefined ? 'none' : checkedKeyframeName(enter)
}

export interface PresenceExitLane {
  restore(): void
}

export function installPresenceExitLane(): PresenceExitLane {
  resetPresenceExitDefectReports()
  const originalGetComputedStyle = window.getComputedStyle.bind(window)
  const originalWarn = console.warn

  window.getComputedStyle = ((element: Element, pseudoElement?: string | null) => {
    const style = originalGetComputedStyle(element, pseudoElement ?? undefined)
    const animationName = resolveAnimationName(element)
    // Proxied, not replaced: other computed-style readers still need the real
    // object, and jsdom's getters must run with it as their receiver.
    return new Proxy(style, {
      get(target, property): unknown {
        if (property === 'animationName') {
          return animationName
        }
        const value: unknown = Reflect.get(target, property, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  }) as typeof window.getComputedStyle

  console.warn = (...args: unknown[]): void => {
    const [message] = args
    if (typeof message === 'string' && message.startsWith(PRESENCE_EXIT_DEFECT_WARNING_PREFIX)) {
      throw new Error(message)
    }
    originalWarn(...args)
  }

  return {
    restore(): void {
      window.getComputedStyle = originalGetComputedStyle
      console.warn = originalWarn
    },
  }
}

/** Completes a running exit the way the browser's `animationend` does. Wrap in `act()`. */
export function fireExitAnimationEnd(node: Element): void {
  const animationName = resolveAnimationName(node)
  if (!animationName.startsWith(EXIT_ANIMATION_NAME_PREFIX)) {
    throw new Error(
      `fireExitAnimationEnd: no exit animation on this node (animation-name resolved to "${animationName}"). ` +
        `Class list: "${node.getAttribute('class') ?? ''}".`,
    )
  }
  const event = new Event('animationend', { bubbles: true })
  Object.defineProperty(event, 'animationName', { value: animationName })
  node.dispatchEvent(event)
}
