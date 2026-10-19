import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { publicAssetUrl } from '../lib/catalog'
import type { ProductVariant } from '../types'

type ProductVariantsEditorProps = {
  variants: ProductVariant[]
  autoGenerate: boolean
  busy: boolean
  onChange: (variants: ProductVariant[]) => void
  onAutoGenerateChange: (enabled: boolean) => void
  onUpload: (index: number, files: File[]) => void
}

function colorHex(name: string): string {
  const color = name.trim()
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(color)) return `#${color.slice(1).split('').map((part) => part + part).join('').toLowerCase()}`
  if (typeof CSS === 'undefined' || !CSS.supports('color', color)) return ''

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return ''
  context.fillStyle = color
  const normalized = context.fillStyle
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.toLowerCase()
  const rgb = normalized.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  return rgb ? `#${rgb.slice(1, 4).map((value) => Number(value).toString(16).padStart(2, '0')).join('')}` : ''
}

export default function ProductVariantsEditor({
  variants, autoGenerate, busy, onChange, onAutoGenerateChange, onUpload,
}: ProductVariantsEditorProps) {
  function update(index: number, changes: Partial<ProductVariant>) {
    onChange(variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...changes } : variant))
  }

  return (
    <details className="optional-product-section">
      <summary>Color options <span>Optional</span></summary>
      <p className="muted">Add color options if needed. Photos are optional and are never recolored.</p>
      {variants.map((variant, index) => {
        const hex = colorHex(variant.color_name)
        return <fieldset className="variant-editor" key={variant.id ?? `new-${index}`}>
          <legend>Color {index + 1}</legend>
          <div className="form-row">
            <label>Color name or #hex<input
              value={variant.color_name}
              placeholder="Black or #222222"
              onChange={(event) => update(index, { color_name: event.target.value, color_hex: colorHex(event.target.value) })}
            /></label>
            <label>Stock<input type="number" min="0" step="1" value={variant.stock} onChange={(event) => update(index, { stock: Number(event.target.value) })} /></label>
          </div>
          {hex && <span className="variant-swatch-preview"><i style={{ backgroundColor: hex }} />{variant.color_name}</span>}
          <label className="upload-button"><ImagePlus size={15} /> Add color photos
            <input type="file" accept="image/*" multiple disabled={busy} onChange={(event) => onUpload(index, Array.from(event.target.files ?? []))} />
          </label>
          {variant.images.length > 0 && <div className="image-preview-list">
            {variant.images.map((path, imageIndex) => <div className="image-preview-item" key={`${path}-${imageIndex}`}>
              <img className="admin-image-preview" src={publicAssetUrl(path)} alt={`${variant.color_name} view`} />
              <button type="button" className="icon-button danger-button" aria-label="Remove photo" onClick={() => update(index, { images: variant.images.filter((_, current) => current !== imageIndex) })}><Trash2 size={13} /></button>
            </div>)}
          </div>}
          <button type="button" className="icon-button danger-button" onClick={() => onChange(variants.filter((_, variantIndex) => variantIndex !== index))}><Trash2 size={14} /> Remove color</button>
        </fieldset>
      })}
      <button type="button" className="button button-quiet" onClick={() => onChange([...variants, { color_name: '', color_hex: '', stock: 1, images: [] }])}><Plus size={15} /> Add a color</button>
      <label className="inline-toggle"><input type="checkbox" checked={autoGenerate} onChange={(event) => onAutoGenerateChange(event.target.checked)} /> Try automatic photo generation <span className="label-hint">(not set up yet)</span></label>
    </details>
  )
}
