import { Flex, Text, type TextCompatProps } from '@universe/mycelium'
import { ParseKeys } from 'i18next'
import { type ReactElement, type ReactNode, cloneElement } from 'react'
import { useTranslation } from 'react-i18next'

type TextProps = TextCompatProps

type InlineGradientProps = {
  i18nKey: ParseKeys
  /** Element rendered for the `<gradient>…</gradient>`*/
  component: ReactElement<{ children?: ReactNode }>
  textProps?: TextProps
}

// Chinese / Japanese ideographs + kana (not Hangul — Korean is space-delimited).
const CJK_CHAR = /[\u2E80-\u9FFF\uF900-\uFAFF]/
// Keep non-CJK runs intact (incl. Latin in mixed tokens like "ETHの"); char-split CJK only.
const CJK_SPLIT = /[^\u2E80-\u9FFF\uF900-\uFAFF]+|[\u2E80-\u9FFF\uF900-\uFAFF]/g

function splitForWrapping(part: string): string[] {
  const tokens = part.match(/\s+|\S+\s*/g) ?? []
  return tokens.flatMap((token) => {
    if (!CJK_CHAR.test(token)) {
      return [token]
    }
    return token.match(CJK_SPLIT) ?? [token]
  })
}

/**
 * Android specific component to handle the layout of a nested gradient text.
 *
 * Gradient (MaskedView) nested inside `<Text>` via `<Trans>` misaligns on Android (WALL-5311).
 * It splits the text and renders the gradient elements as siblings alongside the Text components inside a <Flex> container.
 * Supports multiple `<gradient>` segments.
 */

export function InlineGradient({ i18nKey, component, textProps }: InlineGradientProps): JSX.Element {
  const { t } = useTranslation()

  const text = t(i18nKey)
  const parts = text.split(/<gradient>(.*?)<\/gradient>/)
  const hasGradient = parts.length > 1

  if (!hasGradient) {
    return (
      <Text textAlign="center" {...textProps}>
        {text}
      </Text>
    )
  }

  return (
    <Flex
      row
      flexWrap="wrap"
      justifyContent="center"
      alignSelf="stretch"
      tabIndex={0}
      aria-label={text.replace(/<\/?gradient>/g, '')}
    >
      {parts.flatMap((part, index) => {
        if (index % 2 === 1) {
          return [cloneElement(component, { key: `gradient-${index}` }, part)]
        }

        return splitForWrapping(part).map((token, tokenIndex) => (
          <Text key={`text-${index}-${tokenIndex}`} {...textProps}>
            {token}
          </Text>
        ))
      })}
    </Flex>
  )
}
