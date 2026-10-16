import { default as React } from 'react'
import { SectionListData } from 'react-native'
import { SettingsSection, SettingsSectionItem, SettingsSectionItemComponent } from 'src/components/Settings/SettingsRow'

export type SectionData = SettingsSectionItem | SettingsSectionItemComponent
export type SectionInfo = { section: SectionListData<SectionData, SettingsSection> }

export type SettingsListProps = {
  sections: SettingsSection[]
  // Function component (not ComponentType): the underlying list types separators as
  // ComponentType<{ leadingItem }>, and a class component's props/defaultProps aren't assignable to it.
  ItemSeparatorComponent?: React.FunctionComponent
  ListFooterComponent?: React.ReactElement | null
  ListHeaderComponent?: React.ReactElement | null
  // Not RN's ListRenderItemInfo: this list doesn't implement the separator protocol, and `index` is
  // the flattened row index across all sections, not the per-section index that type implies.
  renderItem: (info: { item: SectionData; index: number }) => React.ReactElement | null
  renderSectionHeader?: (info: SectionInfo) => React.ReactElement | null
  renderSectionFooter?: (info: SectionInfo) => React.ReactElement | null
  showsVerticalScrollIndicator?: boolean
}
