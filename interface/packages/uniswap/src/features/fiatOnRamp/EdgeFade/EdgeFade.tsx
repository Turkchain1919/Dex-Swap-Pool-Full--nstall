import type { FlexCompatProps } from '@universe/mycelium'
import { PlatformSplitStubError } from 'utilities/src/errors'

// EdgeFade.native.tsx still implements against ui/src's FlexProps/LinearGradient and isn't
// type-checked against this FlexCompatProps — with no moduleSuffixes platform resolution, every
// importer (incl. mobile's FiatOnRampServiceProviders.tsx) typechecks against this stub, not
// native's actual runtime type. A `$`-token prop added at a call site here would typecheck clean
// but could break silently on native, until EdgeFade.native.tsx converts off ui/src LinearGradient.
export function EdgeFade(_props: { side: 'left' | 'right' } & FlexCompatProps): JSX.Element {
  throw new PlatformSplitStubError('EdgeFade')
}
