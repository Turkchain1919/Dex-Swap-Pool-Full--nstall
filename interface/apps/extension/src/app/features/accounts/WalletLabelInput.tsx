import { Flex, Text } from '@universe/mycelium'
import { HeightAnimator } from '@universe/mycelium/height-animator'
import { useEffect, useState } from 'react'
import { TextInput } from 'uniswap/src/components/input/TextInput'

type WalletLabelInputProps = {
  value: string
  error?: string
  onChangeText: (text: string) => void
  placeholder?: string
}

export function WalletLabelInput({ value, error, onChangeText, placeholder }: WalletLabelInputProps): JSX.Element {
  // Keep the last error message mounted while height collapses, so the text
  // doesn't disappear one frame before the animation finishes.
  const [displayedError, setDisplayedError] = useState(error)

  useEffect(() => {
    if (error) {
      setDisplayedError(error)
    }
  }, [error])

  return (
    <Flex width="100%">
      <Flex borderColor="$surface3" borderRadius="$rounded16" borderWidth="$spacing1" width="100%">
        <TextInput
          autoFocus
          borderRadius="$rounded16"
          placeholder={placeholder}
          py="$spacing12"
          textAlign="center"
          value={value}
          width="100%"
          onChangeText={onChangeText}
        />
      </Flex>
      <HeightAnimator open={Boolean(error)}>
        <Text color="$statusCritical" pt="$spacing12" textAlign="center" variant="body3">
          {displayedError}
        </Text>
      </HeightAnimator>
    </Flex>
  )
}
