import { Flex, type FlexCompatProps as FlexProps } from '@universe/mycelium'

/** 1px vertical rule separating details-header metadata items. Pass `alignSelf="stretch"` when the parent row centers its children. */
export function HeaderDivider({ alignSelf }: { alignSelf?: FlexProps['alignSelf'] }): JSX.Element {
  return <Flex width={1} backgroundColor="$surface3" mx="$spacing12" alignSelf={alignSelf} />
}
