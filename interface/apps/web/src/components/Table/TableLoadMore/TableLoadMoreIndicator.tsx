import { Flex, SpinningLoader, Text, zIndexes } from '@universe/mycelium'
import { useTranslation } from 'react-i18next'

type TableLoadMoreIndicatorProps = {
  loadingMore: boolean
}

export function TableLoadMoreIndicator({ loadingMore }: TableLoadMoreIndicatorProps): JSX.Element | null {
  const { t } = useTranslation()

  if (!loadingMore) {
    return null
  }

  return (
    // Overlays the bottom of the table rather than sitting in flow: in-flow, its negative
    // margin shrank TableContainer's height, which pulled the absolutely-anchored
    // TableBottomFade above the table's visual bottom while loading.
    <Flex
      row
      alignItems="center"
      justifyContent="center"
      position="absolute"
      bottom={14}
      left={0}
      right={0}
      zIndex={zIndexes.sticky}
    >
      <Flex
        row
        alignItems="center"
        backgroundColor="$accent2Solid"
        borderRadius="$rounded8"
        width="fit-content"
        p="$padding8"
        gap="$gap8"
        height={34}
      >
        <SpinningLoader size={16} color="$accent1" unstyled />
        <Text variant="body3" color="$accent1">
          {t('common.loading')}
        </Text>
      </Flex>
    </Flex>
  )
}
