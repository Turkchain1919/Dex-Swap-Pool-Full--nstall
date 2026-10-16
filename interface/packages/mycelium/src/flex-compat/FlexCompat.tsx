// Web/default implementation; native override lives in FlexCompat.native.tsx.
// Re-exported here so bare module resolution (bundlers without .web extension
// priority) and the package barrel resolve correctly — the same shape
// TouchableAreaCompat uses, and for the same reason: a throwing base stub on a
// critical-path web primitive turns any bundler misconfiguration into a runtime
// crash for the web app. See the PR body (packages/mycelium/CLAUDE.md
// prescribes the throwing stub; the primitives owner needs to settle which
// convention wins).
import type { ForwardRefExoticComponent, PropsWithoutRef } from 'react'
// The cross-primitive ref-prop contract (see compat/web-element.ts for why it
// is a union of ref types, not a ref of a union).
import type { CompatRefProp } from '../compat/web-element'
import { FlexCompat as FlexCompatWeb } from './FlexCompat.web'
import type { FlexCompatProps } from './props'

export const FlexCompat: ForwardRefExoticComponent<
  PropsWithoutRef<FlexCompatProps> & { ref?: CompatRefProp | undefined }
> =
  // SAFETY: the runtime value is the web leg unchanged; only the accepted ref
  // TYPE widens (type-level only — a component typed over one ref arm cannot
  // be assigned the multi-arm prop shape without this cast).
  FlexCompatWeb as unknown as ForwardRefExoticComponent<
    PropsWithoutRef<FlexCompatProps> & { ref?: CompatRefProp | undefined }
  >
