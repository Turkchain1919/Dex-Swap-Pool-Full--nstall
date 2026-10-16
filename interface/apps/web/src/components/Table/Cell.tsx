import { Flex } from '@universe/mycelium'
import type { FlexCompatProps as FlexProps, MyceliumElement } from '@universe/mycelium'
import { useMedia } from '@universe/mycelium/theme-hooks-compat'
import { ForwardedRef, forwardRef, PropsWithChildren } from 'react'
import { LoadingBubble } from '~/components/Tokens/loading'

export const Cell = forwardRef(
  (
    {
      loading,
      children,
      testId,
      style,
      ...rest
    }: PropsWithChildren<{ loading?: boolean; testId?: string } & Partial<FlexProps>>,
    ref: ForwardedRef<MyceliumElement>,
  ) => {
    const media = useMedia()
    const paddingY = rest.py ?? (media.lg ? '$spacing12' : '$spacing16')
    // Calculate loading bubble height based on cell padding to ensure consistent dimensions
    const loadingBubbleHeight = media.lg ? '$spacing32' : '$spacing16'
    const justifyContent = rest.justifyContent ?? 'flex-end'

    return (
      <Flex
        row
        overflow="hidden"
        data-testid={testId}
        justifyContent={justifyContent}
        px={rest.px ?? '$spacing12'}
        py={paddingY}
        alignItems={rest.alignItems ?? 'center'}
        ref={ref}
        {...rest}
        style={{ fontVariantNumeric: 'lining-nums tabular-nums', ...style }}
      >
        {loading ? (
          <LoadingBubble
            height={loadingBubbleHeight}
            width="75%"
            containerProps={{
              justifyContent,
              testID: 'cell-loading-bubble',
            }}
          />
        ) : (
          children
        )}
      </Flex>
    )
  },
)

Cell.displayName = 'Cell'
