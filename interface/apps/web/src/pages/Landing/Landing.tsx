import { Flex } from '@universe/mycelium'
import { styled } from '@universe/mycelium/styled'
import { heights } from '@universe/mycelium/tokens'
import { lazy, memo, Suspense, useRef } from 'react'
import { Hero } from '~/pages/Landing/sections/Hero'

// The Fold is always loaded, but is lazy-loaded because it is not seen without user interaction.
// Annotating it with webpackPreload allows it to be ready when requested.
const Fold = lazy(() => import(/* webpackPreload: true */ './Fold'))

const INTERFACE_NAV_HEIGHT = heights['interface-nav']

const Rive = lazy(() => import(/* webpackPreload: true */ '~/setupRive'))

const Grain = styled('div', {
  platform: 'web',
  base: 'flex flex-col items-stretch basis-auto box-border relative min-h-[0px] min-w-[0px] shrink-0 absolute inset-0 z-0 opacity-[0.018]',
  // Open-domain constant (url() value): the inline lane, not a class.
  inlineStyle: () => ({ background: 'url(/images/noise-color.png)' }),
})

function LandingInner({ transition }: { transition?: boolean }) {
  const scrollAnchor = useRef<HTMLDivElement | null>(null)
  const scrollToRef = () => {
    if (scrollAnchor.current) {
      window.scrollTo({
        top: scrollAnchor.current.offsetTop - 120,
        behavior: 'smooth',
      })
    }
  }

  return (
    <Flex position="relative" alignItems="center" mt={-INTERFACE_NAV_HEIGHT} minWidth="100vw" testID="landing-page">
      <Grain />
      <Hero scrollToRef={scrollToRef} transition={transition} />
      <Suspense>
        <Rive />
        <Fold ref={scrollAnchor} />
      </Suspense>
    </Flex>
  )
}

export const Landing = memo(LandingInner)
