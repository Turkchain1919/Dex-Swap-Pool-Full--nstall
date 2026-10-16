/**
 * The house styled() factory for the Tamagui → Tailwind migration.
 *
 * Ships as the `@universe/mycelium/styled` subpath export — deliberately NOT
 * re-exported from the package barrel, so factory adoption stays visible in
 * imports. Usage guide: labs/workbench/docs/styled-factory.md. The reusable
 * emission/parity gate every native-reachable conversion must bind is
 * `describeStyledFactoryGate` (packages/tailwind/src/parity/core/native/
 * styled-factory-gate.ts); the conversion fixtures proving it live in
 * packages/tailwind/src/parity/styled-factory.
 */
export { collectStyledClasses, validateStyledClasses } from './classes'
export { markHoverable, styled } from './styled'
export type { StyledHostKind } from './styled'
export type {
  CompoundRule,
  ExposedStyledConfig,
  GetProps,
  HoverRule,
  InlineStyle,
  InlineStyleProps,
  StyledComponent,
  StyledConfig,
  StyledProps,
  StyledVariants,
  VariantSelection,
} from './types'
