import { Flex, type FlexCompatProps } from '@universe/mycelium'
import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'

export const MOBILE_BAR_MAX_HEIGHT = 100 // ensure that it's translated out of view on scroll

type MobileBottomBarProps = FlexCompatProps & { hide?: boolean }

export const MobileBottomBar: ForwardRefExoticComponent<MobileBottomBarProps & RefAttributes<HTMLDivElement>> =
  forwardRef<HTMLDivElement, MobileBottomBarProps>(function MobileBottomBar(
    { hide = false, $xl: xl, '$platform-web': platformWeb, ...props },
    ref,
  ) {
    return (
      <Flex
        ref={ref}
        zIndex="$dropdown"
        position="fixed"
        bottom={hide ? -MOBILE_BAR_MAX_HEIGHT : 0}
        right={0}
        left={0}
        justifyContent="space-between"
        gap="$gap8"
        width="100%"
        maxHeight={MOBILE_BAR_MAX_HEIGHT}
        py="$padding12"
        px="$padding16"
        display="none"
        // The legacy config revealed as `block`, not `flex`, so `justifyContent`/`gap` above are
        // inert in the only state where this bar is visible — they were dead on main too, and are
        // kept only to stay render-identical. Switching the reveal to `flex` would activate both
        // and change the layout; do that as a deliberate fix, not while normalizing shapes.
        $xl={{ display: 'block', ...xl }}
        // Scoped to `bottom`: the legacy `animation: 'lazy'` compiled to an unscoped 500ms
        // transition, which flashes theme-token colours on a light/dark toggle.
        $platform-web={{ transition: 'bottom 500ms cubic-bezier(0.25, 0.1, 0.25, 1)', ...platformWeb }}
        {...props}
      />
    )
  })
