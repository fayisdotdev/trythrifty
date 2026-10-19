import type { ProductFieldDefinition } from '../types'

type ProductFieldInputProps = {
  field: ProductFieldDefinition
  value: unknown
  onChange: (value: unknown) => void
}

export default function ProductFieldInput({ field, value, onChange }: ProductFieldInputProps) {
  if (field.hidden) return null
  const label = <>{field.label}{field.unit && <span className="label-hint">{field.unit}</span>}</>
  if (field.type === 'boolean') return (
    <label className="inline-toggle"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} /> {label}</label>
  )
  if (field.type === 'select') return (
    <label>{label}<select required={field.required} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose…</option>
      {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
    </select></label>
  )
  return (
    <label>{label}<input
      type={field.type === 'number' ? 'number' : 'text'}
      step={field.type === 'number' ? 'any' : undefined}
      required={field.required}
      value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      onChange={(event) => onChange(field.type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)}
    /></label>
  )
}
