import { GasFeeResult } from '@universe/api'
import { Flex, Text, iconSizes } from '@universe/mycelium'
import { useTranslation } from 'react-i18next'
import { useDappLastChainId } from 'src/app/features/dapp/hooks'
import { DappRequestContent } from 'src/app/features/dappRequests/DappRequestContent'
import { useDappRequestQueueContext } from 'src/app/features/dappRequests/DappRequestQueueContext'
import {
  isApproveRevoke,
  parseSpenderAddress,
} from 'src/app/features/dappRequests/requestContent/EthSend/Approve/utils'
import {
  ApproveSendTransactionRequest,
  DappRequest as DappRequestBaseType,
} from 'src/app/features/dappRequests/types/DappRequestTypes'
import { CurrencyLogo } from 'uniswap/src/components/CurrencyLogo/CurrencyLogo'
import { LearnMoreLink } from 'uniswap/src/components/text/LearnMoreLink'
import { UniswapHelpUrls } from 'uniswap/src/constants/urls'
import { DappRequestType } from 'uniswap/src/features/dappRequests/types'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { useCurrencyInfo } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { TransactionType, TransactionTypeInfo } from 'uniswap/src/features/transactions/types/transactionDetails'
import { buildCurrencyId } from 'uniswap/src/utils/currencyId'

function useDappRequestTokenRecipientInfo(request: DappRequestBaseType, dappUrl: string): Maybe<CurrencyInfo> {
  const activeChain = useDappLastChainId(dappUrl)
  const type = request.type
  const to = type === DappRequestType.SendTransaction ? request.transaction.to : undefined

  const identifier =
    activeChain && type === DappRequestType.SendTransaction && to ? buildCurrencyId(activeChain, to) : undefined

  return useCurrencyInfo(identifier)
}

interface ApproveRequestContentProps {
  transactionGasFeeResult: GasFeeResult
  dappRequest: ApproveSendTransactionRequest
  onCancel: () => Promise<void>
  onConfirm: (transactionTypeInfo?: TransactionTypeInfo) => Promise<void>
}

export function ApproveRequestContent({
  dappRequest,
  transactionGasFeeResult,
  onCancel,
  onConfirm,
}: ApproveRequestContentProps): JSX.Element {
  const { t } = useTranslation()
  const { dappUrl } = useDappRequestQueueContext()

  // To detect a revoke, both the transaction value and the approve() amount must be zero
  const isRevoke = isApproveRevoke(dappRequest.transaction)

  const tokenInfo = useDappRequestTokenRecipientInfo(dappRequest, dappUrl)
  const tokenSymbol = tokenInfo?.currency.symbol
  const spender = parseSpenderAddress(dappRequest.transaction.data ?? '')
  const transactionTypeInfo: TransactionTypeInfo | undefined =
    dappRequest.transaction.to && spender
      ? {
          type: TransactionType.Approve,
          tokenAddress: dappRequest.transaction.to,
          spender,
        }
      : undefined
  const onConfirmWithTransactionTypeInfo = (): Promise<void> => onConfirm(transactionTypeInfo)
  const titleCopy = tokenSymbol
    ? isRevoke
      ? t('dapp.request.revoke.title', { tokenSymbol })
      : t('dapp.request.approve.title', { tokenSymbol })
    : t('dapp.request.approve.fallbackTitle')

  return (
    <DappRequestContent
      contentHorizontalPadding="$spacing12"
      showNetworkCost
      confirmText={isRevoke ? t('dapp.request.revoke.action') : t('dapp.request.approve.action')}
      headerIcon={<CurrencyLogo hideNetworkLogo currencyInfo={tokenInfo} size={iconSizes.icon40} />}
      title={titleCopy}
      transactionGasFeeResult={transactionGasFeeResult}
      onCancel={onCancel}
      onConfirm={onConfirmWithTransactionTypeInfo}
    >
      <Flex
        backgroundColor="$surface2"
        borderColor="$surface3"
        borderRadius="$rounded12"
        borderWidth="$spacing1"
        gap="$spacing4"
        p="$spacing12"
      >
        <Text color="$neutral2" variant="body4">
          {isRevoke ? t('dapp.request.revoke.helptext') : t('dapp.request.approve.helptext')}
        </Text>
        <LearnMoreLink
          textVariant="body4"
          url={isRevoke ? UniswapHelpUrls.articles.revokeExplainer : UniswapHelpUrls.articles.approvalsExplainer}
        />
      </Flex>
    </DappRequestContent>
  )
}
