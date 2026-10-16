export enum DappRequestType {
  ChangeChain = 'ChangeChain',
  GetAccount = 'GetAccount',
  GetChainId = 'GetChainId',
  GetPermissions = 'GetPermissions',
  RequestAccount = 'RequestAccount',
  RequestPermissions = 'RequestPermissions',
  RevokePermissions = 'RevokePermissions',
  SendTransaction = 'SendTransaction',
  SignMessage = 'SignMessage',
  SignTransaction = 'SignTransaction',
  SignTypedData = 'SignTypedData',
  UniswapOpenSidebar = 'UniswapOpenSidebar',
  SendCalls = 'SendCalls',
  GetCallsStatus = 'GetCallsStatus',
  GetCapabilities = 'GetCapabilities',
  // Read-only JSON-RPC (eth_call, eth_blockNumber, …) proxied to the background SW so the
  // fetch runs in an extension-privileged context, not the dapp page's CORS-bound context.
  ProviderDirect = 'ProviderDirect',
}

export enum DappResponseType {
  AccountResponse = 'AccountResponse',
  ChainIdResponse = 'ChainIdResponse',
  ChainChangeResponse = 'ChainChangeResponse',
  ErrorResponse = 'ErrorResponse',
  GetPermissionsResponse = 'GetPermissions',
  RequestPermissionsResponse = 'RequestPermissions',
  RevokePermissionsResponse = 'RevokePermissions',
  SignTransactionResponse = 'SignTransactionResponse',
  SendTransactionResponse = 'SendTransactionResponse',
  SignTypedDataResponse = 'SignTypedDataResponse',
  SignMessageResponse = 'SignMessageResponse',
  UniswapOpenSidebarResponse = 'UniswapOpenSidebarResponse',
  SendCallsResponse = 'SendCallsResponse',
  GetCallsStatusResponse = 'GetCallsStatusResponse',
  GetCapabilitiesResponse = 'GetCapabilitiesResponse',
  ProviderDirectResponse = 'ProviderDirectResponse',
}

export enum EthMethod {
  EthSign = 'eth_sign',
  EthSendTransaction = 'eth_sendTransaction',
  SignTypedData = 'eth_signTypedData', // Note: WalletConnect supports this, Extension uses v4 only
  SignTypedDataV4 = 'eth_signTypedData_v4',
  WalletSwitchEthereumChain = 'wallet_switchEthereumChain',
  WalletGetCapabilities = 'wallet_getCapabilities',
  WalletSendCalls = 'wallet_sendCalls',
  WalletGetCallsStatus = 'wallet_getCallsStatus',
  WalletAddEthereumChain = 'wallet_addEthereumChain',
  PersonalSign = 'personal_sign',
  EthChainId = 'eth_chainId',
  EthRequestAccounts = 'eth_requestAccounts',
  EthAccounts = 'eth_accounts',
  WalletGetPermissions = 'wallet_getPermissions',
  WalletRequestPermissions = 'wallet_requestPermissions',
  WalletRevokePermissions = 'wallet_revokePermissions',
}

export type ExtensionEthMethod =
  | EthMethod.EthChainId
  | EthMethod.EthRequestAccounts
  | EthMethod.EthAccounts
  | EthMethod.EthSendTransaction
  | EthMethod.PersonalSign
  | EthMethod.WalletSwitchEthereumChain
  | EthMethod.WalletGetPermissions
  | EthMethod.WalletRequestPermissions
  | EthMethod.WalletRevokePermissions
  | EthMethod.WalletGetCapabilities
  | EthMethod.WalletSendCalls
  | EthMethod.WalletGetCallsStatus
  | EthMethod.SignTypedDataV4

export type WalletConnectEthMethod =
  | EthMethod.EthSign
  | EthMethod.EthSendTransaction
  | EthMethod.SignTypedData
  | EthMethod.SignTypedDataV4
  | EthMethod.WalletSwitchEthereumChain
  | EthMethod.WalletGetCapabilities
  | EthMethod.WalletSendCalls
  | EthMethod.WalletGetCallsStatus
  | EthMethod.WalletAddEthereumChain
  | EthMethod.PersonalSign

export type EthSignMethod =
  | EthMethod.PersonalSign
  | EthMethod.SignTypedData
  | EthMethod.SignTypedDataV4
  | EthMethod.EthSign

/** Request surface used for Blockaid scan policy and failure telemetry. */
export type BlockaidScanType = 'send-calls' | 'signature' | 'transaction'
/**
 * Coarse scan stage for operational rollups. `validation` also includes request-shaped HTTP
 * rejections that prevented Blockaid from returning a validation result; use `reason` for the
 * precise cause. `unknown` is reserved for wallet/query failures outside the Blockaid boundary.
 */
export type BlockaidScanFailureKind = 'simulation' | 'transport' | 'unknown' | 'validation'
/** Bounded, wallet-owned cause used as the stable analytics grouping key. */
export type BlockaidScanFailureReason =
  | 'missing_simulation'
  | 'missing_validation'
  | 'no_response'
  | 'rate_limited'
  | 'request_rejected'
  | 'request_too_large'
  | 'server_error'
  | 'simulation_error'
  | 'timeout'
  | 'transport_error'
  | 'unknown'
  | 'validation_error'
