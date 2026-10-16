import { createIcon } from '../factories/createIcon'
import { Line, Svg } from '../factories/svg-elements'

export const [DotLine, AnimatedDotLine] = createIcon({
  name: 'DotLine',
  getIcon: (props) => (
    <Svg viewBox="850 0 300 200" {...props}>
      <Line
        x1="0"
        x2="3000"
        y1="100"
        y2="100"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
        strokeDasharray="1, 45"
      />
    </Svg>
  ),
})
