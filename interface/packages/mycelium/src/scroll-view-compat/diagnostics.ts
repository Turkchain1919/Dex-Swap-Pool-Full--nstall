/**
 * Dev diagnostics for the ScrollView compat web leg, on the shared compat
 * warner (`compat/dev-warning.ts`). Platformless so the leg can import it
 * without widening its own export surface (the platform-legs suite pins leg
 * exports as identical).
 */
import { createOneTimeWarner } from '../compat/dev-warning'

const warner = createOneTimeWarner()

/** One-time diagnostic: the prop is real on native and in RNW, so silence here would read as a rendering bug. */
export function warnStickyHeadersUnsupported(): void {
  warner.warnOnce(
    'stickyHeaderIndices',
    'ScrollViewCompat: stickyHeaderIndices is not implemented on web (react-native-web wraps the indexed children in sticky-positioned Views); the headers will scroll away. Position sticky headers explicitly, or keep this call site native-only.',
  )
}

/** Test-only: clears the one-time guard so suites can assert the warning per case. */
export function __resetScrollViewCompatWarnings(): void {
  warner.reset()
}
