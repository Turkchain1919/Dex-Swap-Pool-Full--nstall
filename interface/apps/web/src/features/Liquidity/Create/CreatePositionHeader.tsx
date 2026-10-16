import { Flex, Text, TouchableArea } from '@universe/mycelium'
import { BackArrow } from '@universe/mycelium/icons/BackArrow'
import { Chevron } from '@universe/mycelium/icons/Chevron'
import type { ReactNode } from 'react'
import { BreadcrumbNavContainer, BreadcrumbNavLink } from '~/components/BreadcrumbNav'

/**
 * Shared header for the create-position / add-liquidity surfaces: breadcrumb row plus a title row
 * (optional back arrow, title, right-aligned actions). Both `FormWrapper` (legacy create, migrate,
 * and the `/positions/add/new` create-pool leg) and the `/positions/add` pool browser render this so their
 * typography, spacing, and (via the fixed row height) the title's vertical position stay in lockstep —
 * stepping between them must not shift the title up/down. The back arrow is per-surface (`onBack`).
 */
export function CreatePositionHeader({
  leadingBreadcrumb,
  trailingBreadcrumb,
  onBack,
  title,
  actions,
}: {
  leadingBreadcrumb: { label: ReactNode; to: string }
  trailingBreadcrumb: ReactNode
  // When provided, renders the back arrow. Omit to hide it (e.g. flows with no in-app back target).
  onBack?: () => void
  title: ReactNode
  actions?: ReactNode
}): JSX.Element {
  return (
    <>
      <BreadcrumbNavContainer aria-label="breadcrumb-nav">
        <BreadcrumbNavLink to={leadingBreadcrumb.to}>
          {leadingBreadcrumb.label} <Chevron size="$icon.16" color="$neutral2" rotate="180deg" />
        </BreadcrumbNavLink>
        {trailingBreadcrumb}
      </BreadcrumbNavContainer>
      {/* Fixed minHeight keeps the title's vertical position independent of how tall `actions` is
          (a short text button vs a full toolbar), so stepping between surfaces doesn't shift it. */}
      <Flex
        row
        alignItems="center"
        justifyContent="space-between"
        gap="$gap20"
        width="100%"
        minHeight="$spacing48"
        mb="$spacing16"
        $md={{ flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Flex row alignItems="center" gap="$spacing8" grow>
          {onBack && (
            <TouchableArea onPress={onBack}>
              <BackArrow size="$icon.24" color="$neutral1" />
            </TouchableArea>
          )}
          <Text variant="heading3">{title}</Text>
        </Flex>
        {actions}
      </Flex>
    </>
  )
}
