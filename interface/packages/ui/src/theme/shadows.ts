import { isWebApp } from '@universe/environment'
import type { FlexProps } from '@universe/mycelium'
import { useMemo } from 'react'
import { useIsDarkMode } from 'ui/src/hooks/useIsDarkMode'
import { colors, colorsDark, opacify } from 'ui/src/theme/color'

/**
 * The `$platform-web` pool is declared as what these helpers actually return
 * rather than as `Pick<FlexProps, '$platform-web'>`. That pool type carries the
 * whole long-tail style surface, whose values admit `number` on 76 keys that CSS
 * types as enums, so spreading these props into a component whose `$platform-web`
 * is `CSSProperties` failed on the first such key. Both helpers only ever set
 * `boxShadow`.
 */
type ShadowProps = Pick<FlexProps, 'shadowColor' | 'shadowOffset' | 'shadowRadius'> & {
  '$platform-web'?: { boxShadow?: string }
}

// TODO WALL-3699 replace with spore shadow support
export function useShadowPropsShort(): ShadowProps {
  const isDarkMode = useIsDarkMode()

  return useMemo(
    () =>
      isWebApp
        ? {
            '$platform-web': {
              boxShadow: isDarkMode
                ? `0px 1px 3px 0px ${opacify(12, colors.black)}, 0px 1px 2px 0px ${opacify(24, colors.black)}`
                : `0px 1px 6px 2px ${opacify(3, colors.black)}, 0px 1px 2px 0px ${opacify(2, colors.black)}`,
            },
          }
        : {
            shadowColor: isDarkMode ? 'rgba(0, 0, 0, 0.24)' : 'rgba(0, 0, 0, 0.02)',
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 6,
          },
    [isDarkMode],
  )
}

export function useShadowPropsMedium(): ShadowProps {
  const isDarkMode = useIsDarkMode()

  return useMemo(
    () =>
      isWebApp
        ? {
            '$platform-web': {
              boxShadow: isDarkMode
                ? `0px 10px 15px -3px ${opacify(54, colorsDark.surface1)}, 0px 4px 6px -2px ${opacify(40, colorsDark.surface1)}`
                : `0px 6px 12px -3px ${opacify(4, colorsDark.surface1)}, 0px 2px 5px -2px ${opacify(3, colorsDark.surface1)}`,
            },
          }
        : {
            shadowColor: opacify(4, colorsDark.surface1),
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 12,
          },
    [isDarkMode],
  )
}
