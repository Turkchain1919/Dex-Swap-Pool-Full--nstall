import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { styled, type StyledComponent } from '@universe/mycelium/styled'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const NEW_BADGE_VARIANTS = {} as const

// Empty variants table + explicit annotation: the inferred styled() type isn't
// portable under declaration emit (TS2883). Typography = the legacy `variant: 'body4'` preset, inlined.
export const NewBadge: StyledComponent<typeof Text, typeof NEW_BADGE_VARIANTS> = styled(Text, {
  variants: NEW_BADGE_VARIANTS,
  base: '[font-family:var(--stext-font-book)] text-[12px] [line-height:16px] [font-weight:485] [color:var(--stext-accent1)] px-[6px] py-[2px] [background-color:var(--stext-accent2)] rounded-[8px]',
})

/** Shelf section header: title (plus optional badge/adornment) on the left, "View all" on the right. */
export function AssetShelfHeader({
  title,
  badge,
  onViewAll,
}: {
  title: string
  badge?: ReactNode
  onViewAll: () => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <Flex row alignItems="center" justifyContent="space-between">
      <Flex row alignItems="center" gap="$spacing8">
        <Text variant="subheading1" color="$neutral1">
          {title}
        </Text>
        {badge}
      </Flex>
      <TouchableArea onPress={onViewAll}>
        <Text variant="buttonLabel3" color="$neutral2">
          {t('common.viewAll')}
        </Text>
      </TouchableArea>
    </Flex>
  )
}
