import { Button, Flex } from '@universe/mycelium'
import { ArrowRight } from '@universe/mycelium/icons/ArrowRight'
import { useTranslation } from 'react-i18next'

export function OpenSidebarButton({
  openedSideBar,
  handleOpenSidebar,
  handleOpenWebApp,
}: {
  openedSideBar: boolean
  handleOpenSidebar: () => Promise<void>
  handleOpenWebApp: () => Promise<void>
}) {
  const { t } = useTranslation()
  return (
    <Flex row alignSelf="stretch">
      <Button
        // Explicit size/color (20.7px white = legacy large-button icon slot): the web Button styles
        // icons via descendant classes that the icon's inline defaults beat — remove once INFRA-3474 lands
        icon={openedSideBar ? <ArrowRight color="$white" size={20.7} /> : undefined}
        iconPosition="after"
        size="large"
        variant={openedSideBar ? 'branded' : 'default'}
        emphasis={openedSideBar ? 'primary' : 'secondary'}
        onPress={openedSideBar ? handleOpenWebApp : handleOpenSidebar}
      >
        {openedSideBar ? t('onboarding.complete.go_to_uniswap') : t('onboarding.complete.button')}
      </Button>
    </Flex>
  )
}
