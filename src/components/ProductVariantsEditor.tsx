import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import type { ProductVariant } from '../types'
import PhotoListEditor from './PhotoListEditor'

type ProductVariantsEditorProps = {
  variants: ProductVariant[]
  busy: boolean
  onChange: (variants: ProductVariant[]) => void
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
  variants, busy, onChange, onUpload,
}: ProductVariantsEditorProps) {
  function update(index: number, changes: Partial<ProductVariant>) {
    onChange(variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, ...changes } : variant))
  }

  return (
    <details className="optional-product-section">
      <summary>Color options <span>Optional</span></summary>
      <p className="muted">Add a photo to each color before publishing. Photos are never recolored.</p>
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
          <PhotoListEditor photos={variant.images} label={`${variant.color_name || 'Color'} photo`} onChange={(images) => update(index, { images })} />
          <button type="button" className="icon-button danger-button" onClick={() => onChange(variants.filter((_, variantIndex) => variantIndex !== index))}><Trash2 size={14} /> Remove color</button>
        </fieldset>
      })}
      <button type="button" className="button button-quiet" onClick={() => onChange([...variants, { color_name: '', color_hex: '', stock: 1, images: [] }])}><Plus size={15} /> Add a color</button>
    </details>
  )
}
