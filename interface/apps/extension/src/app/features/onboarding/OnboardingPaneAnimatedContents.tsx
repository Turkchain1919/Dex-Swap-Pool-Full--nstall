import type { SporeAnimationCurveName } from '@universe/tailwind/animations'

const SINGLE_PANE_DURATION = 200

/** Spore curve for the onboarding pane pager; its duration is SINGLE_PANE_DURATION. */
export const ONBOARDING_PANE_CURVE: SporeAnimationCurveName = `${SINGLE_PANE_DURATION}ms`

// TODO: EXT-1164 - Move Keyring methods to workers to not block main thread during onboarding
// the pager in <OnboardingSteps /> is exit-before-enter sequenced, so we are
// running two 200ms animations sequentially - first to exit, then enter so we
// double this constant. if we change that, needs to change here
const ONBOARDING_PANE_TRANSITION_DURATION = SINGLE_PANE_DURATION * 2
export const ONBOARDING_PANE_TRANSITION_DURATION_WITH_LEEWAY = ONBOARDING_PANE_TRANSITION_DURATION + 200
