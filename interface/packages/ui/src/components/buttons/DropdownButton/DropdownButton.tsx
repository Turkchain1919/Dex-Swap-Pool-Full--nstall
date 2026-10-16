import { Flex } from '@universe/mycelium'
import { DROPDOWN_EXPANDED_ICON_CLASSES, ThemedIconCompat } from '@universe/mycelium/button-frame-compat'
import { Fragment, forwardRef, useMemo } from 'react'
import { useIsStringOrTransTag } from 'ui/src/components/buttons/Button/hooks/useIsStringOrTransTag'
import { getIconPosition } from 'ui/src/components/buttons/Button/utils/getIconPosition'
import { getIsButtonDisabled } from 'ui/src/components/buttons/Button/utils/getIsButtonDisabled'
import {
  DropdownButtonFrame,
  type DropdownButtonFrameProps,
} from 'ui/src/components/buttons/DropdownButton/DropdownButtonFrame'
import { DropdownButtonText } from 'ui/src/components/buttons/DropdownButton/DropdownButtonText'
import type { DropdownButtonProps } from 'ui/src/components/buttons/DropdownButton/types'
import { RotatableChevron } from 'ui/src/components/icons'
type LeftContainerProps = Pick<DropdownButtonProps, 'elementPositioning' | 'children' | 'icon'> & {
  label: DropdownButtonProps['children']
}

const LeftContainer = ({ elementPositioning, children, icon, label }: LeftContainerProps): JSX.Element => {
  if (elementPositioning === 'grouped' && icon && label) {
    return (
      <Flex row alignItems="center" gap="$gap12">
        {children}
      </Flex>
    )
  }

  return <Fragment>{children}</Fragment>
}

/**
 * Rebuilt `DropdownButton` (INFRA-3285): same composition as the legacy
 * component, on the mycelium `button-frame-compat` primitives instead of
 * `ui/src`'s Tamagui-bearing `Button` internals. The icon/chevron coloring
 * previously done by cloning in an explicit `color` + `$group-item-hover`
 * (a Tamagui group-pseudo the rebuilt frame no longer establishes) is now
 * `ThemedIconCompat`'s own `className` composition:
 * `DROPDOWN_EXPANDED_ICON_CLASSES` repaints the icon while `isExpanded`, and
 * its `group-hover/sbtn:` half reads `ButtonFrameCompat`'s own group marker,
 * so hovering the frame recolors the icon with zero JS wiring.
 */
const DropdownButtonComponent = forwardRef<HTMLElement, DropdownButtonProps>(function DropdownButton(
  {
    children,
    emphasis = 'secondary',
    icon,
    disabled,
    elementPositioning = 'equal',
    isExpanded,
    chevronColor,
    chevronSize,
    ...props
  },
  ref,
) {
  const isDisabled = getIsButtonDisabled({ disabled, loading: undefined })
  const isStringOrTransTag = useIsStringOrTransTag(children)

  /* When a `dropdownSelector` has an icon and text (children), we need to add a flexGrow={1} to the Flex to make sure the icon, text, and right chevron are equally spaced */
  const SpacingElement = useMemo(() => {
    return elementPositioning !== 'grouped' && icon && children ? <Flex flexGrow={1} /> : null
  }, [elementPositioning, icon, children])

  const expandedIconClassName = isExpanded ? DROPDOWN_EXPANDED_ICON_CLASSES : undefined

  return (
    <DropdownButtonFrame
      ref={ref}
      iconPosition={getIconPosition('before')}
      emphasis={emphasis}
      isDisabled={isDisabled}
      isExpanded={isExpanded}
      // `DropdownButtonProps`' open style surface still derives from the Tamagui-typed
      // `ButtonProps` (Button itself is not part of this rebuild), so a couple of its cells
      // (e.g. `m` accepting `null`) are cosmetically wider than the compat surface below;
      // both accept the exact same runtime values, so this boundary cast is safe.
      {...(props as Omit<DropdownButtonFrameProps, 'emphasis' | 'isDisabled' | 'isExpanded' | 'iconPosition'>)}
    >
      <LeftContainer icon={icon} elementPositioning={elementPositioning} label={children}>
        {icon && (
          <ThemedIconCompat
            isDisabled={disabled}
            emphasis={emphasis}
            size={props.size}
            variant="default"
            typeOfButton="button"
            className={expandedIconClassName}
          >
            {icon}
          </ThemedIconCompat>
        )}
        {SpacingElement}

        {isStringOrTransTag ? <DropdownButtonText isExpanded={isExpanded}>{children}</DropdownButtonText> : children}
      </LeftContainer>

      {SpacingElement}

      <ThemedIconCompat
        isDisabled={disabled}
        emphasis={emphasis}
        size={props.size}
        variant="default"
        typeOfButton="button"
        className={expandedIconClassName}
      >
        {/* explicit currentColor: RotatableChevron's underlying icon factory bakes a hardcoded
        defaultFill when no color is passed, which would otherwise beat ThemedIconCompat's
        wrapping `text-*` color classes instead of inheriting them. `animation` is omitted --
        RotatableChevron already defaults to 'fast'. A caller-supplied `chevronColor` lands on the
        glyph itself, so it deliberately wins over that inherited emphasis color. */}
        <RotatableChevron
          color={chevronColor ?? 'currentColor'}
          size={chevronSize}
          direction={isExpanded ? 'up' : 'down'}
        />
      </ThemedIconCompat>
    </DropdownButtonFrame>
  )
})

/**
 * A dropdown button component that can be used to select an option from a dropdown menu.
 *
 * @param {DropdownButtonProps} props - The props for the `DropdownButton` component.
 * @param {ReactNode} props.children - The content of the button.
 * @param {ButtonEmphasis} props.emphasis - The `Button` emphasis.
 * @param {ReactNode} props.icon - The icon of the button.
 * @param {ElementPositioning} props.elementPositioning - When there are both `icon` and `children`, 'grouped' will group them together on the left side of the button's container.
 * @param {boolean} props.isExpanded - Whether the button is expanded.
 * @param {string} props.chevronColor - Paints the trailing chevron independently of the label.
 * @param {string} props.chevronSize - Sizes the trailing chevron.
 */
type DropdownButtonComponentType = typeof DropdownButtonComponent & {
  Text: typeof DropdownButtonText
  Icon: typeof ThemedIconCompat
  Chevron: typeof RotatableChevron
}

const DropdownButtonWithStatics = DropdownButtonComponent as DropdownButtonComponentType
DropdownButtonWithStatics.Text = DropdownButtonText
DropdownButtonWithStatics.Icon = ThemedIconCompat
DropdownButtonWithStatics.Chevron = RotatableChevron

export const DropdownButton = DropdownButtonWithStatics
