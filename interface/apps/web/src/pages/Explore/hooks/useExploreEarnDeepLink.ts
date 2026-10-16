import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router'
import { selectHasDismissedExploreEarnCoachmark } from 'uniswap/src/features/behaviorHistory/selectors'
import { setExploreEarnCoachmarkDismissed } from 'uniswap/src/features/behaviorHistory/slice'
import { useEvent } from 'utilities/src/react/hooks'

const EXPLORE_SECTION_PARAM = 'section'
const EXPLORE_EARN_SECTION_PARAM_VALUE = 'earn'

interface UseExploreEarnDeepLinkResult {
  dismissCoachmark: () => void
  earnSectionRef: React.RefObject<HTMLDivElement | null>
  shouldShowCoachmark: boolean
}

export function useExploreEarnDeepLink(): UseExploreEarnDeepLinkResult {
  const [params] = useSearchParams()
  const dispatch = useDispatch()
  const hasDismissedCoachmark = useSelector(selectHasDismissedExploreEarnCoachmark)
  const earnSectionRef = useRef<HTMLDivElement>(null)
  const isEarnDeepLink = params.get(EXPLORE_SECTION_PARAM) === EXPLORE_EARN_SECTION_PARAM_VALUE
  const shouldShowCoachmark = isEarnDeepLink && !hasDismissedCoachmark

  useEffect(() => {
    if (!shouldShowCoachmark) {
      return undefined
    }

    // Run after the page's mount effects so its existing tab-nav scroll cannot override this reveal.
    const animationFrame = window.requestAnimationFrame(() => {
      earnSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [shouldShowCoachmark])

  const dismissCoachmark = useEvent(() => {
    dispatch(setExploreEarnCoachmarkDismissed())
  })

  return {
    dismissCoachmark,
    earnSectionRef,
    shouldShowCoachmark,
  }
}
