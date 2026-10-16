import { UniverseChainId } from '@universe/chains'
import { CSSProperties } from 'react'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { isUniverseChainId } from 'uniswap/src/features/chains/utils'

const getDefaultBorderRadius = (size: number) => size / 2 - 4

type ChainLogoProps = {
  chainId: UniverseChainId
  className?: string
  size?: number
  borderRadius?: number
  style?: CSSProperties
  testId?: string
  fillContainer?: boolean
  // Bare string until mycelium ships a typed transition prop.
  transition?: string
}
export function ChainLogo({
  chainId,
  style,
  size = 12,
  borderRadius = getDefaultBorderRadius(size),
  testId,
  fillContainer = false,
  transition,
}: ChainLogoProps) {
  const isSupportedChain = isUniverseChainId(chainId)

  if (!isSupportedChain) {
    return null
  }

  const { label, logo } = getChainInfo(chainId)
  const iconSize = fillContainer ? '100%' : size + 'px'

  return (
    <img
      aria-labelledby="titleID"
      data-testid={testId}
      width={iconSize}
      height={iconSize}
      src={logo as string}
      style={{ ...style, borderRadius: borderRadius + 'px', transition }}
      alt={`${label} logo`}
    />
  )
}
