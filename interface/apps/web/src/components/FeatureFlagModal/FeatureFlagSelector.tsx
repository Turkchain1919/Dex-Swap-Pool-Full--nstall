import { useSporeColors } from '@universe/mycelium'

interface FeatureFlagSelectOption {
  value: string
  label: string
}

/** Normalize options to { value, label }[] for display */
function normalizeOptions(
  options: Array<string | number> | Record<string, string | number> | FeatureFlagSelectOption[],
): FeatureFlagSelectOption[] {
  if (Array.isArray(options)) {
    return options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: String(opt), label: String(opt) }
      }
      const o = opt as FeatureFlagSelectOption
      return { value: String(o.value), label: o.label }
    })
  }
  return Object.entries(options).map(([key, value]) => ({ value: String(value), label: key }))
}

interface FeatureFlagSelectorProps {
  value: string
  onValueChange: (value: string) => void
  options: Array<string | number> | Record<string, string | number> | FeatureFlagSelectOption[]
  id?: string
  placeholder?: string
  /** Trigger width; default 125 */
  width?: number | string
}

export function FeatureFlagSelector({
  value,
  onValueChange,
  options,
  id,
  placeholder,
  width = 125,
}: FeatureFlagSelectorProps): JSX.Element {
  const colors = useSporeColors()
  const items = normalizeOptions(options)

  return (
    <select
      id={id}
      value={value}
      style={{
        borderRadius: 12,
        padding: 8,
        backgroundColor: colors.surface3.val,
        fontWeight: 535,
        fontSize: 16,
        border: 'none',
        color: colors.neutral1.val,
        maxWidth: 'max-content',
        width,
      }}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {placeholder !== undefined && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {items.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
