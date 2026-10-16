import { ensure0xHex } from '@universe/encoding'
import { signTypedData } from 'uniswap/src/features/transactions/signing'
import { SignMessageInfo, SignTypedDataInfo } from 'wallet/src/features/wallet/signing/signing'
import { formatMessageForSigning, prepareTypedDataForSigning } from 'wallet/src/features/wallet/signing/utils'

// https://docs.ethers.io/v5/api/signer/#Signer--signing-methods
export async function signMessage({ message, account, signerManager, signAsString }: SignMessageInfo): Promise<string> {
  const signer = await signerManager.getSignerForAccount(account)
  const formattedMessage = formatMessageForSigning(message, signAsString)
  const signature = await signer.signMessage(formattedMessage)
  return ensure0xHex(signature)
}

export async function signTypedDataMessage({
  message,
  account,
  signerManager,
  expectedChainId,
}: SignTypedDataInfo): Promise<string> {
  const parsedData = prepareTypedDataForSigning({ message, expectedChainId })

  const signer = await signerManager.getSignerForAccount(account)

  return signTypedData({
    domain: parsedData.domain,
    types: parsedData.types,
    value: parsedData.message,
    signer,
  })
}
