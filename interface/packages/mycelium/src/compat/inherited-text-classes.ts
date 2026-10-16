import type { InheritedTextStyleProps } from './inherited-text-props'
/**
 * Legacy Tamagui accepted a small set of Text's web-only style props via
 * `$platform-web` on any primitive — CSS text props inherit to descendants
 * regardless of which ancestor declares them. `CompatPlatformProps` widens
 * every primitive's `$platform-web` pool with `InheritedTextStyleProps`
 * (INFRA-3673); this compiles that slice, reusing Text's own `TEXT_ALIGN_CLASS`
 * enum so the emitted class is byte-identical whichever primitive sets it —
 * already in the closed-set base tier via Text, so no new safelist entries.
 * Deliberately not folded into `commonStyleClasses`: Text already compiles
 * `textAlign` itself (`text-compat/typography-classes.ts`), and every other
 * `commonStyleClasses` caller has no such prop to read — kept as its own
 * opt-in call so Text's output stays single-sourced.
 *
 * Split out of `style-classes.ts` to stay under that file's `max-lines` budget.
 */
import { type ClassList, enumClass } from './style-classes'

export const TEXT_ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
  justify: 'text-justify',
  start: 'text-start',
  end: 'text-end',
}

export function inheritedTextClasses(props: InheritedTextStyleProps): ClassList {
  return [
    props.textAlign !== undefined &&
      enumClass({ map: TEXT_ALIGN_CLASS, value: props.textAlign, cssProp: 'text-align' }),
  ]
}
