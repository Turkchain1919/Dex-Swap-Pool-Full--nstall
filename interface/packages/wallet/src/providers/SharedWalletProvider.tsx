import { Store } from '@reduxjs/toolkit'
import { ComplianceClientProvider } from '@universe/compliance'
import { ReactNode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { SharedPersistQueryClientProvider } from 'uniswap/src/data/reactQuery/SharedPersistQueryClientProvider'
import { AppPortalProvider } from 'wallet/src/providers/portal-provider'

interface SharedProviderProps {
  children: ReactNode
  reduxStore: Store
}

// A provider meant for sharing across all surfaces.
// Props should be defined as needed and clarified in name to improve readability
export function SharedWalletProvider({ reduxStore, children }: SharedProviderProps): JSX.Element {
  return (
    <ReduxProvider store={reduxStore}>
      <SharedPersistQueryClientProvider>
        <ComplianceClientProvider>
          <AppPortalProvider>{children}</AppPortalProvider>
        </ComplianceClientProvider>
      </SharedPersistQueryClientProvider>
    </ReduxProvider>
  )
}
