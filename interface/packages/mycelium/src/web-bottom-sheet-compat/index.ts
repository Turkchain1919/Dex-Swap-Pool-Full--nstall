/**
 * The WebBottomSheet compat surface (INFRA-3329): a Tamagui-free, drop-in
 * `WebBottomSheet` for converting `ui/src` consumers
 * (`import { WebBottomSheet } from '@universe/mycelium/web-bottom-sheet-compat'`).
 * Its `useIsTouchDevice` companion lives in
 * `@universe/mycelium/theme-hooks-compat`.
 */
export { WebBottomSheet } from './WebBottomSheet'
export { WEB_BOTTOM_SHEET_OVERLAY_TEST_ID } from './props'
export type { WebBottomSheetProps, WebBottomSheetSnapPointsMode } from './props'
