import { DeltaArrow, isDeltaZero } from '~/components/DeltaArrow/DeltaArrow'
import { render } from '~/test-utils/render'

describe('isDeltaZero', () => {
  it.each([
    ['0.00%', true],
    ['0,00 %', true], // comma-decimal zero (e.g. fr-FR)
    ['%0', true], // tr-TR formats with a leading percent sign
    ['0,50 %', false], // sub-1% move in a comma-decimal locale (CONS-3128 follow-up bug)
    ['1.23%', false],
    ['-', false], // placeholder
  ])('isDeltaZero(%s) → %s', (formattedDelta, expected) => {
    expect(isDeltaZero(formattedDelta)).toBe(expected)
  })
})

describe('Delta', () => {
  it('should render correctly', () => {
    const { asFragment } = render(<DeltaArrow delta={0} formattedDelta="0.00" />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('should render correctly when delta is positive', () => {
    const { asFragment } = render(<DeltaArrow delta={1} formattedDelta="1.00" />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('should render correctly when delta is negative', () => {
    const { asFragment } = render(<DeltaArrow delta={-1} formattedDelta="-1.00" />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('should render positive zero when delta is close to zero but positive', () => {
    const { asFragment } = render(<DeltaArrow delta={0.000000000000000001} formattedDelta="0.00%" />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('should render negative zero when delta is close to zero but negative', () => {
    const { asFragment } = render(<DeltaArrow delta={-0.000000000000000001} formattedDelta="0.00%" />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('should render positive zero when delta is parsed as positive zero', () => {
    const { asFragment } = render(<DeltaArrow delta={0.000000000000000001} formattedDelta="0.00" />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('should render positive zero when delta is 0', () => {
    const { asFragment } = render(<DeltaArrow delta={0} formattedDelta="0.00" />)
    expect(asFragment()).toMatchSnapshot()
  })
})
