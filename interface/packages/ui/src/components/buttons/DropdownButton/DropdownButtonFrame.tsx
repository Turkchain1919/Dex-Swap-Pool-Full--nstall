import {
  ButtonFrameCompat,
  DROPDOWN_FRAME_BASE_CLASSES,
  DROPDOWN_FRAME_EXPANDED_CLASSES,
  type ButtonEmphasis,
  type ButtonFrameCompatProps,
} from '@universe/mycelium/button-frame-compat'
import { cn } from '@universe/mycelium/cn'
import { forwardRef, type ForwardedRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'

/**
 * Rebuilt `DropdownButtonFrame` (INFRA-3285): legacy `styled(CustomButtonFrame, …)`
 * pinned `variant: 'default'` and `justifyContent: 'space-between'`, and repainted
 * the secondary/tertiary/text-only emphases to a transparent background while
 * `isExpanded` (secondary additionally keeps a `$surface3` border). Both deltas are
 * now literal Tailwind class tables purpose-built for this component
 * (`DROPDOWN_FRAME_BASE_CLASSES` / `DROPDOWN_FRAME_EXPANDED_CLASSES` in
 * `@universe/mycelium/button-frame-compat`), composed onto `ButtonFrameCompat`'s
 * `className` escape hatch so they win the merge after the closed variant cell -
 * the same precedence the legacy `styled()` extension had.
 */
export type DropdownButtonFrameProps = ButtonFrameCompatProps & {
  isExpanded?: boolean
  // Required, unlike the compat frame's own optional `emphasis`: it keys
  // `DROPDOWN_FRAME_EXPANDED_CLASSES`, so a local default here could diverge from
  // `DropdownButton`'s ('secondary') when this frame is rendered directly. Keeping
  // the public surface the single source of the default avoids that split.
  emphasis: ButtonEmphasis
}

function DropdownButtonFrameComponent(
  { isExpanded, emphasis, className, ...props }: DropdownButtonFrameProps,
  ref: ForwardedRef<HTMLElement>,
): JSX.Element {
  return (
    <ButtonFrameCompat
      ref={ref}
      // Pinned explicitly (legacy `styled(CustomButtonFrame, { variant: 'default', ... })` also
      // pinned it) so this stays correct even if ButtonFrameCompat's own default ever changes.
      variant="default"
      emphasis={emphasis}
      className={cn(
        DROPDOWN_FRAME_BASE_CLASSES,
        isExpanded ? DROPDOWN_FRAME_EXPANDED_CLASSES[emphasis] : undefined,
        className,
      )}
      {...props}
    />
  )
}

// Explicit annotation: the inferred type names mycelium-internal prop types
// that the button-frame-compat subpath does not export (TS2883 under
// declaration emit); the instantiation expression keeps the exact same type.
export const DropdownButtonFrame: ForwardRefExoticComponent<DropdownButtonFrameProps & RefAttributes<HTMLElement>> =
  forwardRef(DropdownButtonFrameComponent)

DropdownButtonFrame.displayName = 'DropdownButtonFrame'
