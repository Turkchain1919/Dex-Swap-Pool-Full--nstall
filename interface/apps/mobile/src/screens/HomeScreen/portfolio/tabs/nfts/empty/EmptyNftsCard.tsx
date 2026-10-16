import { NoNfts } from '@universe/mycelium/icons/NoNfts'
import { useTranslation } from 'react-i18next'
import { BaseCard } from 'uniswap/src/components/BaseCard/BaseCard'

export function EmptyNftsCard(): JSX.Element {
  const { t } = useTranslation()

  return (
    <BaseCard.EmptyState
      description={t('tokens.nfts.list.none.description.default')}
      icon={<NoNfts color="$neutral3" size="$icon.100" />}
      title={t('tokens.nfts.list.none.title')}
    />
  )
}
