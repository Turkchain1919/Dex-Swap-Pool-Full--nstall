import { isWebPlatform } from '@universe/environment'
import { curveToAnimationTiming } from '@universe/mycelium/compat'
import { SPORE_ANIMATION_CURVE_CSS, type SporeAnimationCurveName } from '@universe/tailwind/animations'
import { createSlideFadePresence } from '@universe/tailwind/animations/slide-fade-presence'
import type { CSSProperties } from 'react'
import type { EntryExitAnimationFunction } from 'react-native-reanimated'

type SlideFadeConfig = Parameters<typeof createSlideFadePresence>[1]

export interface SlideFadePresenceChildProps {
  entering: EntryExitAnimationFunction
  exiting: EntryExitAnimationFunction
  className?: string
  style?: CSSProperties
}

/**
 * `Presence` sets `data-exiting` on its direct child's node only: the child gates its exit on
 * itself, a node deeper in that subtree on the named group the child opens. Both compile to
 * `[data-exiting]` plus a class, which outspecifies the unconditional enter utility alongside it.
 */
const CHILD_CLASSES =
  'group/presence-child animate-spore-enter-presence data-exiting:animate-spore-exit-presence opacity-[1]'
const DESCENDANT_CLASSES =
  'animate-spore-enter-presence group-data-exiting/presence-child:animate-spore-exit-presence opacity-[1]'

function slideFadePresenceProps(
  webClasses: string,
  { curve, config }: { curve: SporeAnimationCurveName; config: SlideFadeConfig },
): SlideFadePresenceChildProps {
  const { entering, exiting } = createSlideFadePresence(curve, config)
  if (!isWebPlatform) {
    return { entering, exiting }
  }
  const axis = config.axis === 'translateX' ? 'x' : 'y'
  const offset = `${config.offset}px`
  return {
    entering,
    exiting,
    className: webClasses,
    style: {
      ...curveToAnimationTiming(SPORE_ANIMATION_CURVE_CSS[curve]),
      [`--spore-presence-enter-${axis}`]: offset,
      [`--spore-presence-exit-${axis}`]: offset,
    } as CSSProperties,
  }
}

/**
 * Enter/exit presentation for a direct child of mycelium's `Presence`, from the
 * same curve/axis/offset triple as `createSlideFadePresence`.
 *
 * The factory's Tamagui web leg is dropped, not spread: only Tamagui's presence
 * context runs an `exitStyle` and `Presence` does not enter it, so the web lane
 * is the `spore-*-presence` keyframes whose exit half `Presence` gates with
 * `data-exiting`. Native gets no className; the worklets own both lanes there.
 */
export function slideFadePresenceChildProps(
  curve: SporeAnimationCurveName,
  config: SlideFadeConfig,
): SlideFadePresenceChildProps {
  return slideFadePresenceProps(CHILD_CLASSES, { curve, config })
}

/**
 * The same pair for a node nested inside a `slideFadePresenceChildProps` child, whose own exit is
 * driven by that ancestor leaving. Its translate composes with the ancestor's, and the ancestor's
 * unmount cuts whichever leg is still running — both were true of the Tamagui `AnimatePresence`
 * this replaces, which reached descendants through React context.
 */
export function slideFadePresenceDescendantProps(
  curve: SporeAnimationCurveName,
  config: SlideFadeConfig,
): SlideFadePresenceChildProps {
  return slideFadePresenceProps(DESCENDANT_CLASSES, { curve, config })
}
