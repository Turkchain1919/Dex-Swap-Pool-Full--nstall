/**
 * `react-native` stand-in for the touchable-text-link platform-leg suite: the
 * shared compat mock's hosts plus the `Linking` module the native leg's press
 * handler imports (per the shared mock's contract, a suite needing more
 * surface gets its own mock alongside it instead of widening the shared one).
 */
export * from '../../compat/testing/react-native-mock'

export const Linking = {
  openURL: (_url: string): Promise<void> => Promise.resolve(),
}
