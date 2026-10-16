/**
 * `react-native` stand-in for the linear-gradient-compat platform-leg suite:
 * the shared compat mock's hosts, unchanged (per the shared mock's contract, a
 * suite gets its own module alongside it instead of widening the shared one —
 * this leg needs no extra RN surface, only the sibling expo/uniwind mocks in
 * the test file).
 */
export * from '../../compat/testing/react-native-mock'
