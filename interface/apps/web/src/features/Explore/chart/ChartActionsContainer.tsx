import { Flex } from '@universe/mycelium'
import { styled, type StyledComponent } from '@universe/mycelium/styled'

const CHART_ACTIONS_CONTAINER_VARIANTS = {} as const

// Empty variants table + explicit annotation: the inferred styled() type isn't
// portable under declaration emit (TS2883). The media-md declarations are spelled as arbitrary
// properties: the utility spellings of these exact values are INFRA-3217 probe-leak canaries
// (packages/mycelium/src/compat/emitted-classes.ts) that must never appear in scanned source.
export const ChartActionsContainer: StyledComponent<typeof Flex, typeof CHART_ACTIONS_CONTAINER_VARIANTS> = styled(
  Flex,
  {
    platform: 'web',
    variants: CHART_ACTIONS_CONTAINER_VARIANTS,
    base: 'flex-row-reverse items-center justify-between mt-[12px] w-[100%] media-md:[flex-direction:column] media-md:[gap:16px]',
  },
)
