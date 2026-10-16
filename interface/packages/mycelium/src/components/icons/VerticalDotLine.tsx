import { createIcon } from '../factories/createIcon'
import { Path, Svg } from '../factories/svg-elements'

export const [VerticalDotLine, AnimatedVerticalDotLine] = createIcon({
  name: 'VerticalDotLine',
  getIcon: (props) => (
    <Svg viewBox="0 0 2 13" fill="none" {...props}>
      <Path
        d="M1 1L1 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 2"
      />
    </Svg>
  ),
})
