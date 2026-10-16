/**
 * Platformless base stub for `AccordionCompat` — bundlers resolve the `.web`/
 * `.native` legs via extension order; reaching this module at runtime is a
 * bundler-configuration defect. The public TYPE surface lives in `./props`
 * and is re-exported from here (what `tsc`, with no platform-extension
 * resolution, typechecks consumers against), so the legs cannot drift on it.
 */
import { PlatformSplitStubError } from '@universe/environment'
import type {
  AccordionCompatComponent,
  AccordionCompatProps,
  AccordionContentCompatProps,
  AccordionHeaderCompatProps,
  AccordionHeightAnimatorCompatProps,
  AccordionItemCompatProps,
  AccordionTriggerCompatProps,
} from './props'

export type {
  AccordionCompatComponent,
  AccordionCompatProps,
  AccordionContentCompatProps,
  AccordionHeaderCompatProps,
  AccordionHeightAnimatorCompatProps,
  AccordionItemCompatProps,
  AccordionTriggerCompatProps,
} from './props'

function stub(name: string): never {
  throw new PlatformSplitStubError(name)
}

export const AccordionCompat: AccordionCompatComponent = Object.assign(
  (_props: AccordionCompatProps): never => stub('AccordionCompat'),
  {
    Item: (_props: AccordionItemCompatProps): never => stub('AccordionCompat.Item'),
    Header: (_props: AccordionHeaderCompatProps): never => stub('AccordionCompat.Header'),
    Trigger: (_props: AccordionTriggerCompatProps): never => stub('AccordionCompat.Trigger'),
    Content: (_props: AccordionContentCompatProps): never => stub('AccordionCompat.Content'),
    HeightAnimator: (_props: AccordionHeightAnimatorCompatProps): never => stub('AccordionCompat.HeightAnimator'),
  },
)
