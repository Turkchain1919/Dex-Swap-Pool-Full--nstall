import { create } from 'zustand'

interface ImpersonationState {
  /**
   * Address that was active when impersonation started, so stopping can put it back.
   * Intentionally not persisted — after a reload we fall back to any remaining wallet.
   */
  previousActiveAddress: Address | null
  actions: {
    setPreviousActiveAddress: (address: Address | null) => void
  }
}

export const useImpersonationStore = create<ImpersonationState>()((set) => ({
  previousActiveAddress: null,
  actions: {
    setPreviousActiveAddress: (previousActiveAddress): void => set({ previousActiveAddress }),
  },
}))
