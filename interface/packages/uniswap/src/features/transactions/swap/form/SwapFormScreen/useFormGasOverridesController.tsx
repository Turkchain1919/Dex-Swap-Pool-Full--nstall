import { type TransactionRequest } from '@ethersproject/providers'
import { UniverseChainId } from '@universe/chains'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { AutoGasTooltipModal } from 'uniswap/src/features/gas/components/AutoGasTooltipModal'
import { CrosschainNotSupportedModal } from 'uniswap/src/features/gas/components/CrosschainNotSupportedModal'
import { NetworkCostEditorModal } from 'uniswap/src/features/gas/components/NetworkCostEditor/NetworkCostEditorModal'
import {
  getRecommendedGasFieldsFromQuoteGas,
  type RecommendedGasFieldValues,
} from 'uniswap/src/features/gas/components/NetworkCostEditor/useRecommendedGasFields'
import { useGasChipDispatch } from 'uniswap/src/features/gas/hooks/useGasChipDispatch'
import type { GasFeeOverrides } from 'uniswap/src/features/gas/types'
import {
  useTransactionSettingsActions,
  useTransactionSettingsStore,
} from 'uniswap/src/features/transactions/components/settings/stores/transactionSettingsStore/useTransactionSettingsStore'
import { useSwapFormScreenStore } from 'uniswap/src/features/transactions/swap/form/stores/swapFormScreenStore/useSwapFormScreenStore'
import {
  useSwapFormStore,
  useSwapFormStoreDerivedSwapInfo,
} from 'uniswap/src/features/transactions/swap/stores/swapFormStore/useSwapFormStore'
import { isClassic } from 'uniswap/src/features/transactions/swap/utils/routing'
import type { CurrencyField } from 'uniswap/src/types/currency'
import { useEvent } from 'utilities/src/react/hooks'

type OpenModal = 'editor' | 'auto-tooltip' | 'crosschain' | undefined

/**
 * Owns the open-modal state, tx snapshot, and modal JSX for the swap form's
 * gas-overrides entry point. Both the web `<FormNetworkCostRow>` (labeled
 * "Network cost" row inside the expanded details panel) and the native
 * `<GasInfoRowWithCustomGasEnabled>` (compact gas chip on mobile) call this hook to drive
 * the same dispatch behavior — only the trigger UI is per-platform.
 *
 * Tap routes to:
 *  - the Network cost editor (custom mode, same-chain)
 *  - the auto-gas tooltip modal (auto mode)
 *  - the crosschain-not-supported modal (custom mode, crosschain swap)
 */
export function useFormGasOverridesController({
  tx,
  chainId,
  // includesDelegation is forwarded for API symmetry with FormNetworkCostRow;
  // the hook itself doesn't consume it today.
  // oxlint-disable-next-line no-unused-vars -- biome-parity: oxlint is stricter here
  includesDelegation,
}: {
  tx: TransactionRequest | undefined
  chainId: UniverseChainId
  includesDelegation?: boolean
}): {
  onPress: () => void
  onCloseModal: () => void
  onResetOverrides: () => void
  isEditorOpen: boolean
  isAutoTooltipOpen: boolean
  isCrosschainOpen: boolean
  modals: ReactNode
} {
  const isCrossChain = useSwapFormScreenStore((s) => s.isCrossChain)
  const { updateSwapForm, focusOnCurrencyField } = useSwapFormStore((s) => ({
    updateSwapForm: s.updateSwapForm,
    focusOnCurrencyField: s.focusOnCurrencyField,
  }))
  const gasOverrides = useTransactionSettingsStore((s) => s.gasOverrides)
  const { setGasOverrides } = useTransactionSettingsActions()
  const { dispatch } = useGasChipDispatch({ isCrossChain })

  // Quote-derived recommended baseline, used when no populated swap tx is
  // available to estimate against (e.g. a Permit2-signature swap on the form,
  // whose `/swap` is deferred until the user signs). Snapshotted on open below.
  const quoteResponse = useSwapFormStoreDerivedSwapInfo((s) => s.trade.trade?.quote)
  const recommendedFallback = useMemo<RecommendedGasFieldValues | undefined>(() => {
    if (!quoteResponse || !isClassic(quoteResponse)) {
      return undefined
    }
    const classicQuote = quoteResponse.quote
    return getRecommendedGasFieldsFromQuoteGas({
      gasUseEstimate: classicQuote.gasUseEstimate,
      gasEstimate: classicQuote.gasEstimates?.[0],
    })
  }, [quoteResponse])

  const [openModal, setOpenModal] = useState<OpenModal>(undefined)
  /** Snapshot of `tx` captured when the editor opens. `/swap` polls every few
   *  seconds — if we forwarded the live `tx` straight through, the editor's
   *  underlying `useGasFeeQuery({ tx })` would re-key on each refetch, which
   *  (a) flashes the "Recommended: X" hint through its loading state and
   *  (b) fires an `/EstimateGasFee` request on every poll. We only want one
   *  `/EstimateGasFee` per modal open — recommended values don't need to track
   *  the live network that aggressively. Re-captured on each open so a fresh
   *  open after a long idle picks up the latest tx. */
  const [editorTx, setEditorTx] = useState<TransactionRequest | undefined>(undefined)
  /** Snapshot of the quote-derived fallback, captured alongside `editorTx` so the
   *  editor's baseline is stable across quote polls while open. */
  const [editorRecommendedFallback, setEditorRecommendedFallback] = useState<RecommendedGasFieldValues | undefined>(
    undefined,
  )
  /** Focus as it was right before the editor opened, so closing puts the form
   *  back where the user left it. Restoring a field unconditionally would pop
   *  the keyboard open on native for someone who had dismissed it, and could
   *  move focus to the wrong side when the focused field wasn't the exact one. */
  const [focusBeforeEditor, setFocusBeforeEditor] = useState<CurrencyField | undefined>(undefined)

  const closeEditorAndRestoreFocus = useEvent((): void => {
    setOpenModal(undefined)
    updateSwapForm({ focusOnCurrencyField: focusBeforeEditor })
  })

  const onPress = useEvent((): void => {
    const action = dispatch()
    switch (action.type) {
      case 'auto-tooltip':
        setOpenModal('auto-tooltip')
        break
      case 'editor':
        setEditorTx(tx)
        setEditorRecommendedFallback(recommendedFallback)
        setFocusBeforeEditor(focusOnCurrencyField)
        // Drop amount-field focus so useInputFocusSync doesn't reclaim the
        // keyboard from the Network cost editor on quote-poll re-renders.
        updateSwapForm({ focusOnCurrencyField: undefined })
        setOpenModal('editor')
        break
      case 'crosschain-not-supported':
        setOpenModal('crosschain')
        break
      default: {
        // Exhaustiveness check: this branch is unreachable as long as
        // GasChipAction stays a 3-variant union. Adding a new variant
        // becomes a type error here, forcing a deliberate decision.
        const _exhaustive: never = action
        throw new Error(`Unexpected gas chip action type: ${String(_exhaustive)}`)
      }
    }
  })

  const onCloseModal = useEvent((): void => {
    if (openModal === 'editor') {
      closeEditorAndRestoreFocus()
      return
    }
    setOpenModal(undefined)
  })

  const onSaveOverrides = useEvent((overrides: GasFeeOverrides): void => {
    setGasOverrides(overrides)
    closeEditorAndRestoreFocus()
  })

  /** Reset clears the saved override and closes the editor. The `gasOverrides`
   *  change cascades through `useTradingApiGasOverrides` → quote requestId →
   *  `useSwapTxAndGasInfoQuery`, which refetches `/swap` without urgency so the
   *  next editor open shows the baseline. */
  const onResetOverrides = useEvent((): void => {
    setGasOverrides(undefined)
    closeEditorAndRestoreFocus()
  })

  const modals = (
    <>
      <NetworkCostEditorModal
        isOpen={openModal === 'editor'}
        tx={editorTx}
        chainId={chainId}
        initialOverrides={gasOverrides}
        recommendedFallback={editorRecommendedFallback}
        surface="swap_form"
        onSave={onSaveOverrides}
        onCancel={onCloseModal}
        onReset={onResetOverrides}
      />
      <AutoGasTooltipModal isOpen={openModal === 'auto-tooltip'} onClose={onCloseModal} />
      <CrosschainNotSupportedModal isOpen={openModal === 'crosschain'} onClose={onCloseModal} />
    </>
  )

  return {
    onPress,
    onCloseModal,
    onResetOverrides,
    isEditorOpen: openModal === 'editor',
    isAutoTooltipOpen: openModal === 'auto-tooltip',
    isCrosschainOpen: openModal === 'crosschain',
    modals,
  }
}
