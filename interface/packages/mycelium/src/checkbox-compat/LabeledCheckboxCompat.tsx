// Web/default implementation; native override lives in
// LabeledCheckboxCompat.native.tsx. Re-exported here so bare module resolution
// and the package barrel resolve correctly (the TouchableAreaCompat mechanism).
export * from './LabeledCheckboxCompat.web'
