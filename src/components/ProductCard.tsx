import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Product } from '../types'

type ProductCardProps = {
  product: Product
  formatPrice: (value: number) => string
  onAdd: (product: Product, size: string, color: string) => void
}

export default function ProductCard({ product, formatPrice, onAdd }: ProductCardProps) {
  const [size, setSize] = useState(product.sizes[0] ?? 'One size')
  const [color, setColor] = useState(product.colors[0]?.name ?? 'Default')

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        <span className="product-tag">PRE-LOVED FIND</span>
        <button className="quick-add" onClick={() => onAdd(product, size, color)} aria-label={`Add ${product.name} to bag`}>
          <Plus size={18} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-heading">
          <div><span className="product-category">{product.category}</span><h3>{product.name}</h3></div>
          <strong>{formatPrice(product.price)}</strong>
        </div>
        {product.description && <p className="product-description">{product.description}</p>}
        <div className="product-options">
          {product.sizes.length > 0 && (
            <label>Size<select value={size} onChange={(event) => setSize(event.target.value)}>
              {product.sizes.map((option) => <option key={option}>{option}</option>)}
            </select></label>
          )}
          {product.colors.length > 0 && (
            <label>Colour<select value={color} onChange={(event) => setColor(event.target.value)}>
              {product.colors.map((option) => <option key={option.name}>{option.name}</option>)}
            </select></label>
          )}
        </div>
        <button className="text-action" onClick={() => onAdd(product, size, color)}>Add to your bag <span>↗</span></button>
      </div>
    </article>
  )
}
