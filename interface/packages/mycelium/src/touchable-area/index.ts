export { parseGroupStateProp } from '../compat'
/**
 * Keep the `AnimatedTouchableAreaCompat` re-export below extensionless — an
 * explicit `.tsx` specifier defeats `.web`-priority bundler resolution and
 * silently pins production consumers to the throwing base stub.
 */
export { AnimatedTouchableAreaCompat } from './AnimatedTouchableAreaCompat'
export type { AnimatedTouchableAreaCompatProps } from './animated-props'
export { touchableAreaCompatClassName, touchableAreaStyleClasses } from './compile'
export { isModifierClick } from './modifier-click'
export { resolveTouchableAreaCompatProps, SURFACE5_HOVERED, type ResolvedTouchableAreaProps } from './resolve'
export { TouchableAreaCompat } from './TouchableAreaCompat'
export type {
  GroupState,
  GroupStatePropKey,
  MediaPropKey,
  ModifierPressProps,
  TouchableAreaCompatEvent,
  TouchableAreaCompatProps,
  TouchableAreaCompatPseudoProps,
  TouchableAreaCompatStyleProps,
  TouchableAreaVariant,
} from './props'
