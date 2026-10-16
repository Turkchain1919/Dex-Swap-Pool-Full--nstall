import { useMedia } from '@universe/mycelium/theme-hooks-compat'
import { spacing } from '@universe/mycelium/tokens'
import { useMemo } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

/** Padding around empty-state cards in wallet home Tokens / NFTs tabs. */
export function useWalletTabEmptyStyle(): StyleProp<ViewStyle> {
  const media = useMedia()

  return useMemo(
    () => ({
      paddingTop: media.short ? spacing.spacing12 : spacing.spacing32,
      paddingBottom: media.short ? spacing.spacing12 : spacing.spacing32,
      paddingLeft: media.short ? spacing.none : spacing.spacing12,
      paddingRight: media.short ? spacing.none : spacing.spacing12,
    }),
    [media.short],
  )
}
