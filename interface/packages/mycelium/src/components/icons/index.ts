// Icon barrel for @universe/mycelium (INFRA-2956). Value exports mirror
// ui/src/components/icons/index.tsx name-for-name; the type exports below
// mirror the ROOT ui/src barrel's surface (legacy exports them from
// ui/src/index.ts, not its icons barrel). `./exported` is written by the
// `build:icons` generator (bun mycelium build:icons).

// Sanctioned icon type exports (INFRA-3222) for receiver components typing an
// icon slot (`Icon: GeneratedIcon`, `icon?: ComponentType<IconProps>`).
// Type-only: no runtime emission. Since INFRA-3508 the ref is the honest
// per-platform union (`Ref<Svg | SVGSVGElement>`, the same widening ui's
// INFRA-3314 rebuild carries), so a ui icon value typechecks in a
// mycelium-typed slot (`ui-icon-assignability.test.ts`). The reverse
// direction stays unpinned: mycelium's `GeneratedIconProps` admits
// `hoverColor` (#39964) but still rejects RN-only color values
// (`OpaqueColorValue`/`DynamicColor`) that a ui-typed slot may carry.
export type { GeneratedIcon, GeneratedIconProps, IconProps } from '../factories/createIcon'

export { BackArrow } from './BackArrow'
export { AnimatedCaretChange } from './Caret'
export * from './exported'
export { HeartWithFill } from './HeartWithFill'
export { OnboardingUnicon } from './OnboardingUnicon'
export { OSDynamicCloudIcon } from './OSDynamicCloudIcon'
export { QuestionInCircleFilled } from './QuestionInCircleFilled'
export { RotatableChevron } from './RotatableChevron'
export { Unitag } from './Unitag'
