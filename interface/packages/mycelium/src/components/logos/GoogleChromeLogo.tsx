import { createIcon } from '../factories/createIcon'
import { Svg } from '../factories/svg-elements'

export const [GoogleChromeLogo, AnimatedGoogleChromeLogo] = createIcon({
  name: 'GoogleChromeLogo',
  getIcon: (props) => (
    <Svg viewBox="0 0 48 48" {...props}>
      <defs>
        <linearGradient id="gcl-a" x1="3.2173" y1="15" x2="44.7812" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d93025" />
          <stop offset="1" stopColor="#ea4335" />
        </linearGradient>
        <linearGradient id="gcl-b" x1="20.7219" y1="47.6791" x2="41.5039" y2="11.6837" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fcc934" />
          <stop offset="1" stopColor="#fbbc04" />
        </linearGradient>
        <linearGradient id="gcl-c" x1="26.5981" y1="46.5015" x2="5.8161" y2="10.506" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1e8e3e" />
          <stop offset="1" stopColor="#34a853" />
        </linearGradient>
        <linearGradient id="gcl-d" x1="24" y1="24" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1a73e8" />
          <stop offset="1" stopColor="#1a73e8" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="23.9947" r="12" fill="currentColor" />
      <path
        d="M3.2154,36A24,24,0,1,0,12,3.2154,24,24,0,0,0,3.2154,36ZM34.3923,18A12,12,0,1,1,18,13.6077,12,12,0,0,1,34.3923,18Z"
        fill="none"
      />
      <path
        d="M24,12H44.7812a23.9939,23.9939,0,0,0-41.5639.0029L13.6079,30l.0093-.0024A11.9852,11.9852,0,0,1,24,12Z"
        fill="url(#gcl-a)"
      />
      <circle cx="24" cy="24" r="9.5" fill="url(#gcl-d)" />
      <path
        d="M34.3913,30.0029,24.0007,48A23.994,23.994,0,0,0,44.78,12.0031H23.9989l-.0025.0093A11.985,11.985,0,0,1,34.3913,30.0029Z"
        fill="url(#gcl-b)"
      />
      <path
        d="M13.6086,30.0031,3.218,12.006A23.994,23.994,0,0,0,24.0025,48L34.3931,30.0029l-.0067-.0068a11.9852,11.9852,0,0,1-20.7778.007Z"
        fill="url(#gcl-c)"
      />
    </Svg>
  ),
  defaultFill: '#fff',
})
