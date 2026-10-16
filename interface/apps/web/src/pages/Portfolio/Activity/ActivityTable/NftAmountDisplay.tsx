import { Flex, Text } from '@universe/mycelium'
import { styled } from '@universe/mycelium/styled'
import { memo } from 'react'
import { NFTViewer } from 'uniswap/src/components/nfts/NFTViewer'

interface NftAmountDisplayProps {
  nftImageUrl?: string
  nftName: string
  nftCollectionName?: string
  purchaseAmountText?: string | null
}

const NftImageContainer = styled(Flex, {
  base: 'w-[40px] h-[40px] bg-surface3 rounded-[8px] overflow-hidden',
})

function NftAmountDisplayInner({
  nftImageUrl,
  nftName,
  nftCollectionName,
  purchaseAmountText,
}: NftAmountDisplayProps): JSX.Element {
  return (
    <Flex row alignItems="center" gap="$gap12">
      {nftImageUrl && (
        <NftImageContainer>
          <NFTViewer
            uri={nftImageUrl}
            placeholderContent={nftName || nftCollectionName}
            maxHeight={40}
            svgRenderingDisabled
          />
        </NftImageContainer>
      )}
      <Flex gap="$spacing2">
        <Text variant="body3" fontWeight="500">
          {nftName}
        </Text>
        {nftCollectionName && (
          <Text variant="body3" color="$neutral2">
            {nftCollectionName}
          </Text>
        )}
        {purchaseAmountText && (
          <Text variant="body3" color="$neutral2">
            {purchaseAmountText}
          </Text>
        )}
      </Flex>
    </Flex>
  )
}

export const NftAmountDisplay = memo(NftAmountDisplayInner)
