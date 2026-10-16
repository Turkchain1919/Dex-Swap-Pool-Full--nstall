/**
 * Platformless base stub for `ButtonCompat` — bundlers resolve the real
 * implementation (`ButtonCompat.web.tsx` / `ButtonCompat.native.tsx`) via their
 * platform extension order: `apps/web`'s vite `resolve.extensions` lists
 * `.web.tsx` ahead of `.tsx` (and has no `.native.*` entry), Metro prefers
 * `.native.tsx`. Reaching this module means the platform override did not
 * resolve — a bundler-configuration defect, not an expected failure.
 *
 * The three-file split is required, not stylistic: `dangerfile.ts`
 * `checkSplitFiles()` fails any touched `.native.tsx` that has no `.web.tsx`
 * sibling and no base stub.
 *
 * The public TYPE surface is re-exported from the web leg rather than restated
 * here: `tsc` has no platform-extension resolution, so `./ButtonCompat` is what
 * every web consumer typechecks against, and a hand-copied 20-field props
 * interface is exactly the thing that drifts. `export type` is fully erased, so
 * this creates no runtime edge onto the web leg. The native leg declares its
 * own props, but the press handlers are typed platform-neutrally on BOTH legs
 * (`./press-handler`, INFRA-3261) — the web leg's DOM inheritance must never
 * put a DOM event type on a handler the native leg dispatches to.
 * `export-type-parity.test.ts` pins the exported type NAMES across legs.
 */
import { forwardRef, type JSX } from 'react'
import type { ButtonCompatProps, ButtonIconProps, ButtonTextProps } from './ButtonCompat.web'

export { getContrastTextClass } from './compile'
export type { ButtonEmphasis, ButtonFocusScaling, ButtonIconPosition, ButtonSize, ButtonVariant } from './compile'
export type { ButtonCompatProps, ButtonIconProps, ButtonTextProps } from './ButtonCompat.web'
// Named so a consumer can type a standalone shared handler outside JSX.
export type { ButtonPressHandler, NativeButtonPressEvent, WebButtonPressEvent } from './press-handler'

// Same message as `PlatformSplitStubError`, thrown locally — the sibling
// mycelium stubs (`../shimmer/Shimmer.tsx`, `../floating-overlay/FloatingOverlay.tsx`)
// do the same. Importing the error class from `@universe/environment` would pull
// that package's `chrome/*` closure into every graph that resolves this stub,
// including `export-type-parity.test.ts`'s narrow `types: ['node']` tsc probe.
function stub(name: string): never {
  throw new Error(`${name} not implemented. Did you forget a platform override?`)
}

function ButtonText(_props: ButtonTextProps): JSX.Element {
  return stub('ButtonCompat.Text')
}

function ButtonIcon(_props: ButtonIconProps): JSX.Element | null {
  return stub('ButtonCompat.Icon')
}

// forwardRef so the exported value's type matches the web leg's exactly
// (consumers pass `ref`; the union mirrors the web leg — the node is an
// HTMLAnchorElement with `tag="a"`); the render function throws rather than
// rendering.
const ButtonComponent = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonCompatProps>(
  function ButtonCompat(): JSX.Element {
    return stub('ButtonCompat')
  },
)

export const ButtonCompat = Object.assign(ButtonComponent, {
  Text: ButtonText,
  Icon: ButtonIcon,
})
