/**
 * `@universe/mycelium/scroll-view-compat` — the compat `ScrollView`,
 * replacing the legacy Tamagui `ScrollView` re-exported from the `ui/src`
 * barrel.
 *
 * The component is imported by its BASE specifier so Metro resolves the
 * `.native.tsx` leg and vite the `.web.tsx` leg; the platform-neutral modules
 * (`./props`, `./compile`) are shared by both legs, which is what keeps their
 * exports and style compilation identical.
 */
export {
  nativeScrollViewCompatClassName,
  nativeScrollViewContentContainerClassName,
  scrollViewCompatClassName,
  scrollViewCompatEmission,
  scrollViewContentContainerEmission,
} from './compile'
export type {
  ScrollViewCompatProps,
  ScrollViewCompatRef,
  ScrollViewCompatScrollEvent,
  ScrollViewCompatScrollEventPayload,
  ScrollViewCompatStyleProps,
} from './props'
export { ScrollViewCompat } from './ScrollViewCompat'
