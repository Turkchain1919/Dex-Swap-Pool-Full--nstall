import { cn, Flex } from '@universe/mycelium'
import type { FlexCompatProps as FlexProps } from '@universe/mycelium'
import { PropsWithChildren } from 'react'

export const Card = ({ children, className, ...rest }: PropsWithChildren<FlexProps>) => {
  return (
    <Flex width="100%" className={cn('p-[1rem]', className)} borderRadius="$rounded12" {...rest}>
      {children}
    </Flex>
  )
}

export const DarkGrayCard = ({ children, ...rest }: PropsWithChildren<FlexProps>) => {
  return (
    <Card backgroundColor="$surface3" {...rest}>
      {children}
    </Card>
  )
}
