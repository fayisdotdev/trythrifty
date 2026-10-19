import { useMemo, useState, type CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import type { Product, ProductFieldDefinition, ProductType } from '../types'
import { productSalePrice, publicAssetUrl } from '../lib/catalog'
import { fieldsForProductType, productTypeLabel } from '../config/productSchemas'

type ProductCardProps = {
  product: Product
  productType?: ProductType
  formatPrice: (value: number) => string
  onAdd: (product: Product, size: string, color: string) => void
}

function displayAttribute(field: ProductFieldDefinition, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined || value === '') return ''
  return `${String(value)}${field.unit ? ` ${field.unit}` : ''}`
}

export default function ProductCard({ product, productType, formatPrice, onAdd }: ProductCardProps) {
  const [size, setSize] = useState(product.sizes[0] ?? 'One size')
  const colors = product.variants?.length
    ? product.variants.map(({ color_name, color_hex }) => ({ name: color_name, hex: color_hex }))
    : product.colors
  const [color, setColor] = useState(colors[0]?.name ?? 'Default')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [imageOverride, setImageOverride] = useState('')
  const selectedVariant = product.variants?.find((variant) => variant.color_name === color)
  const salePrice = productSalePrice(product)
  const image = imageOverride || (selectedVariant?.images[0]
    ? publicAssetUrl(selectedVariant.images[0])
    : product.common_images?.[0] ?? product.image_url)
  const gallery = [...new Set([
    ...(product.common_images ?? [product.image_url]),
    ...(selectedVariant?.images ?? []).map(publicAssetUrl),
  ].filter(Boolean))]
  const details = useMemo(() => (productType ? fieldsForProductType(productType.name, productType.fields) : [])
    .filter((field) => !field.hidden)
    .map((field) => ({ field, value: displayAttribute(field, product.attributes?.[field.key]) }))
    .filter(({ value }) => value !== ''), [productType, product.attributes])

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        {image ? <img src={image} alt={product.name} loading="lazy" /> : <div className="product-photo-placeholder">Photo coming soon</div>}
        <span className="product-tag">{productType ? productTypeLabel(productType.name) : 'PRE-LOVED FIND'}</span>
        <button className="quick-add" onClick={() => onAdd(product, size, color)} aria-label={`Add ${product.name} to bag`}>
          <Plus size={18} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-heading">
          <div><span className="product-category">{product.category}</span><h3>{product.name}</h3></div>
          <strong>{salePrice < product.price
            ? <><del>{formatPrice(product.price)}</del> {formatPrice(salePrice)}</>
            : formatPrice(product.price)}</strong>
        </div>
        {product.description && <p className="product-description">{product.description}</p>}
        {details.length > 0 && <button type="button" className="product-detail-toggle" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}>
          {detailsOpen ? 'Hide details' : 'View details'} <span>{detailsOpen ? '−' : '+'}</span>
        </button>}
        {detailsOpen && <>
          {gallery.length > 1 && <div className="product-gallery" aria-label="Product photos">
            {gallery.map((photo) => <button type="button" key={photo} className={image === photo ? 'selected' : ''} onClick={() => setImageOverride(photo)}>
              <img src={photo} alt={`${product.name} view`} loading="lazy" />
            </button>)}
          </div>}
          <dl className="product-attributes">
            {details.map(({ field, value }) => <div key={field.key}><dt>{field.label}</dt><dd>{value}</dd></div>)}
            {product.brand && <div><dt>Brand</dt><dd>{product.brand}</dd></div>}
            {product.condition && <div><dt>Condition</dt><dd>{product.condition}</dd></div>}
          </dl>
        </>}
        <div className="product-options">
          {product.sizes.length > 0 && (
            <label>Size<select value={size} onChange={(event) => setSize(event.target.value)}>
              {product.sizes.map((option) => <option key={option}>{option}</option>)}
            </select></label>
          )}
        </div>
        {colors.length > 0 && <div className="product-swatches" aria-label="Color variants">
          {colors.map((option) => <button
            type="button"
            key={option.name}
            className={`product-swatch ${color === option.name ? 'selected' : ''}`}
            style={{ '--swatch-color': option.hex } as CSSProperties}
            title={option.name}
            aria-label={`Choose ${option.name}`}
            aria-pressed={color === option.name}
            onClick={() => { setColor(option.name); setImageOverride('') }}
          />)}
          <span className="selected-color-name">{color}</span>
        </div>}
        <button className="text-action" onClick={() => onAdd(product, size, color)}>Add to your bag <span>↗</span></button>
      </div>
    </article>
  )
}
