import type { HookEntry } from '@uniswap/client-liquidity/dist/uniswap/liquidity/v2/types_pb'
import { Flex, Text } from '@universe/mycelium'
import { useTranslation } from 'react-i18next'
import {
  type UniswapHookProvenance,
  getUniswapHookProvenanceLabel,
} from 'uniswap/src/features/poolHooks/hooks/useUniswapHookProvenance'
import { shortenAddress } from 'utilities/src/addresses'

interface HookTooltipProps {
  hookEntry: HookEntry
  provenance?: UniswapHookProvenance
}

// Hovering a hook name in the pools table shows the full (untruncated) name and the hook's
// middle-ellipsized address. Hooks Uniswap built or configured additionally call out that provenance.
// Richer details (chain, description, flags) live in HookDetailsModal, opened by clicking the name.
export function HookTooltip({ hookEntry, provenance }: HookTooltipProps) {
  const { t } = useTranslation()
  return (
    <Flex gap="$gap4" p="$spacing4" maxWidth={300}>
      <Text variant="body3" color="$neutral1">
        {hookEntry.name || shortenAddress({ address: hookEntry.address })}
      </Text>
      {provenance !== undefined ? (
        <Text variant="body4" color="$accent1">
          {getUniswapHookProvenanceLabel({ provenance, t })}
        </Text>
      ) : null}
      <Text variant="body4" color="$neutral2">
        {shortenAddress({ address: hookEntry.address, chars: 9, charsEnd: 6 })}
      </Text>
    </Flex>
  )
}
