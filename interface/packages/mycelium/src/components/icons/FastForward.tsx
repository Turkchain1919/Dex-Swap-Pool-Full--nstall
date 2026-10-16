import { createIcon } from '../factories/createIcon'
import { Path, Svg } from '../factories/svg-elements'

export const [FastForward, AnimatedFastForward] = createIcon({
  name: 'FastForward',
  getIcon: (props) => (
    <Svg viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12.5 6.94v10.12c0 .79.86 1.28 1.54.88l8.5-5.06a1.02 1.02 0 0 0 0-1.76l-8.5-5.06a1.02 1.02 0 0 0-1.54.88Zm-10 0v10.12c0 .79.86 1.28 1.54.88l8.5-5.06a1.02 1.02 0 0 0 0-1.76l-8.5-5.06a1.02 1.02 0 0 0-1.54.88Z"
        fill="currentColor"
      />
    </Svg>
  ),
  defaultFill: '#7D7D7D',
})
