import { isAndroid, isWebAppDesktop } from '@universe/environment'
import { Flex, FlexProps } from '@universe/mycelium'
import { Text, TextProps } from '@universe/mycelium'
import { usePostTextElementPositionProps } from 'ui/src/utils/layout'

type ElementAfterTextProps = {
  element?: JSX.Element
  text: string
  wrapperProps?: FlexProps
  textProps?: TextProps
}

const DEFAULT_TEXT_PROPS: TextProps = {
  color: '$neutral1',
  variant: 'body2',
}

export function ElementAfterText({ element, text, wrapperProps, textProps }: ElementAfterTextProps): JSX.Element {
  const { postTextElementPositionProps, onTextLayout } = usePostTextElementPositionProps()

  // Android: render the element inline. The absolute-position-after-last-line path below relies on
  // onTextLayout line metrics that are unreliable under Fabric, mispositioning/collapsing the element.
  if (isWebAppDesktop || isAndroid) {
    return (
      <Flex row alignItems="center" {...wrapperProps}>
        <Text {...DEFAULT_TEXT_PROPS} {...textProps}>
          {text}
        </Text>
        {element}
      </Flex>
    )
  } else {
    return (
      <Flex row alignItems="center" pr={postTextElementPositionProps ? '$spacing24' : undefined} {...wrapperProps}>
        <Text {...DEFAULT_TEXT_PROPS} onTextLayout={onTextLayout} {...textProps}>
          {text}
        </Text>
        <Flex {...postTextElementPositionProps}>{element}</Flex>
      </Flex>
    )
  }
}
