import { cn, Flex, FlexCompatProps, Text } from '@universe/mycelium'
import { useNavigate } from 'react-router'

// `title` here is the card's ReactNode slot, not the HTML title attribute FlexCompatProps declares
type ValuePropCardProps = Omit<FlexCompatProps, 'title'> & {
  smaller?: boolean
  children?: React.ReactNode
  title?: React.ReactNode
  subtitle?: string
  bodyText?: string | React.ReactNode
  button?: React.ReactNode
  alignTextToBottom?: boolean
  href?: string
  to?: string
  color?: string
}

export function ValuePropCard(props: ValuePropCardProps) {
  const { color, alignTextToBottom, href, to, title, children, bodyText, button, subtitle, className, ...rest } = props
  const navigate = useNavigate()

  const handleClick = () => {
    if (to) {
      navigate(to)
    }
  }

  return (
    <Flex
      position="relative"
      flexShrink={1}
      flexGrow={0}
      flexBasis="auto"
      borderRadius={32}
      width="100%"
      overflow="hidden"
      minHeight={240}
      maxWidth="calc(50% - 8px)"
      containerType="normal"
      group="card"
      tag="a"
      href={href}
      target="_blank"
      cursor="pointer"
      rel="noreferrer noopener"
      onPress={handleClick}
      // textDecoration has no FlexCompat prop equivalent; className is the sanctioned long-tail fallback.
      // Merged with the consumer's className so a passed-in one doesn't replace it via {...rest}.
      className={cn('no-underline', className)}
      $lg={{
        maxWidth: '100%',
        height: 'auto',
      }}
      {...rest}
    >
      <Flex
        width="100%"
        flex={1}
        gap={8}
        p="$spacing48"
        alignItems="flex-start"
        zIndex={2}
        pointerEvents="none"
        justifyContent={alignTextToBottom ? 'space-between' : 'flex-start'}
        $xl={{
          p: '$spacing32',
        }}
        $xs={{
          p: 20,
        }}
      >
        {title}
        {subtitle && (
          <Text
            width="100%"
            mt="$spacing16"
            variant="heading2"
            fontWeight="$true"
            color={color}
            overflow="visible"
            $xl={{
              variant: 'heading3',
            }}
            $lg={{
              variant: 'heading2',
            }}
            $xs={{
              variant: 'heading3',
              mt: '$spacing8',
            }}
          >
            {subtitle}
          </Text>
        )}
        <Text
          width="60%"
          mb="$spacing24"
          variant="heading3"
          color={color}
          $xl={{
            fontSize: 18,
            lineHeight: 24,
            width: '100%',
          }}
          $lg={{
            variant: 'heading3',
          }}
          $xs={{
            fontSize: 18,
            lineHeight: 24,
            mb: '$spacing16',
          }}
        >
          {bodyText}
        </Text>
        {button}
      </Flex>
      {children}
    </Flex>
  )
}
