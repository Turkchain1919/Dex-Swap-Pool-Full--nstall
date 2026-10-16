import { createIcon } from '../factories/createIcon'
import { Circle, Svg } from '../factories/svg-elements'

export const [EmptySpinner, AnimatedEmptySpinner] = createIcon({
  name: 'EmptySpinner',
  getIcon: (props) => (
    <Svg viewBox="0 0 20 20" fill="none" {...props}>
      <Circle cx="10" cy="10" r="8" stroke="currentColor" strokeOpacity="0.24" strokeWidth="3" />
    </Svg>
  ),
})
