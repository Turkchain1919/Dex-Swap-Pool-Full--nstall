/**
 * Web leg of the platform split: LayoutAnimation is a React Native API, so the
 * loading transition is a deliberate no-op here — the web Button-tier legs
 * accept `shouldAnimateBetweenLoadingStates` purely for API parity. Only the
 * `.native` implementation animates.
 */
export function useLayoutAnimationOnLoadingChange(_loading: boolean | undefined, _enabled: boolean): void {
  // No-op on web; the .native leg configures the RN LayoutAnimation.
}
