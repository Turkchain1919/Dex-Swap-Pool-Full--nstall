import { styled, type StyledComponent } from '@universe/mycelium/styled'

const DIVIDER_VARIANTS = {} as const

export const Divider: StyledComponent<'div', typeof DIVIDER_VARIANTS> = styled('div', {
  platform: 'web',
  variants: DIVIDER_VARIANTS,
  base: 'w-full h-[1px] border-0 m-0 bg-surface3',
})
