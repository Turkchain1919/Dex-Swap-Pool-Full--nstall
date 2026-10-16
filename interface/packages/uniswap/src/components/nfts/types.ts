/**
 * Shared props type for search input components
 */
export interface SearchInputProps {
  value: string
  onChangeText: (value: string) => void
  dataTestId?: string
  placeholder?: string
  // The concrete values call sites pass; assignable to both the Tamagui Flex and the rebuilt Input
  width?: number | `${number}%`
}
