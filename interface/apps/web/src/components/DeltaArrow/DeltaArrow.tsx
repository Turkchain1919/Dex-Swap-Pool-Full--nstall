import { ArrowChange } from '@universe/mycelium/icons/ArrowChange'
import { isValidDelta } from 'uniswap/src/utils/calculateDelta'

export { calculateDelta } from 'uniswap/src/utils/calculateDelta'
export { DEFAULT_DELTA_COLOR, getDeltaTextColor } from 'uniswap/src/utils/getDeltaTextColor'

/** True when a formatted delta string (e.g. "0.00%") displays as zero, even if the raw delta is a tiny non-zero value. */
export function isDeltaZero(delta: string): boolean {
  // Check digits instead of parseFloat: comma-decimal locales format 0.5% as "0,50 %", which
  // parseFloat truncates to 0. A formatted zero contains only '0' digits regardless of locale.
  const digits = delta.match(/\d/g)
  return digits !== null && digits.every((digit) => digit === '0')
}

interface DeltaArrowProps {
  delta?: number | null
  formattedDelta: string
  noColor?: boolean
  size?: number
}

export function DeltaArrow({ delta, formattedDelta, noColor = false, size = 16 }: DeltaArrowProps) {
  if (!isValidDelta(delta)) {
    return null
  }

  const isZero = isDeltaZero(formattedDelta)

  return Math.sign(delta) < 0 && !isZero ? (
    <ArrowChange aria-label="down" color={noColor ? '$neutral3' : '$statusCritical'} key="arrow-down" size={size} />
  ) : (
    <ArrowChange
      aria-label="up"
      color={isZero || noColor ? '$neutral3' : '$statusSuccess'}
      key="arrow-up"
      rotate="180deg"
      size={size}
    />
  )
}
