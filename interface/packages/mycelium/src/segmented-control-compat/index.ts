export { SegmentedControl } from './SegmentedControl'
// Style tables exported for the resolved-style parity tests (apps/mobile
// compiles them through uniwind's real Metro pipeline — INFRA-2966). Not
// part of the component's supported API: the package's exports map has no
// deeper subpath, and the tests must resolve the exact class strings the
// component renders, so this barrel is the only seam they can import from.
export { containerClasses, getOptionTextColorClass, indicatorPillClasses } from './style-classes'
export type { SegmentedControlGapToken } from './tokens'
export type { SegmentedControlOption, SegmentedControlProps, SegmentedControlSize } from './types'
