import { Button, Flex } from '@universe/mycelium'
import React from 'react'

type ButtonProps = React.ComponentProps<typeof Button>
export const GatingButton = (props: Omit<ButtonProps, 'size' | 'emphasis'>): JSX.Element => {
  return (
    <Flex row>
      <Button size="small" emphasis="secondary" {...props} />
    </Flex>
  )
}
