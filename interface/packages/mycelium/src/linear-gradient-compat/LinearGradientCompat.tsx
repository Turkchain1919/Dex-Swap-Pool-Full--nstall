// Web/default implementation; native override lives in
// LinearGradientCompat.native.tsx. Re-exported here rather than throwing a
// PlatformSplitStubError stub: every compat family with a real native leg
// (Flex/View/Text/TouchableArea/Anchor/ModalCloseIcon) uses this shape, and
// for the same reason FlexCompat.tsx documents — bare module resolution
// (bundlers without .web extension priority) and the package barrel resolve
// through the BASE leg, so a throwing base on a web primitive turns a bundler
// misconfiguration into a runtime crash for the web app. The stub-vs-re-export
// convention question is open with the primitives owner on INFRA-3514.
export * from './LinearGradientCompat.web'
