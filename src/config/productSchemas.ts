import type { ProductFieldDefinition } from '../types'

export const CLOTHING_PRODUCT_SCHEMA: ProductFieldDefinition[] = [
  { key: 'garment_type', label: 'Garment type', type: 'select', required: true, options: ['shirt', 't-shirt', 'hoodie', 'sweatshirt', 'jacket', 'dress', 'top', 'vest'] },
  { key: 'sleeve_type', label: 'Sleeve type', type: 'select', required: true, options: ['sleeveless', 'half', '3/4', 'full'] },
  { key: 'fit', label: 'Fit', type: 'select', required: false, options: ['slim', 'regular', 'relaxed', 'oversized'] },
  { key: 'sizes', label: 'Sizes', type: 'multi_select', required: false, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'] },
  { key: 'gender', label: 'Gender', type: 'select', required: false, options: ['men', 'women', 'unisex'] },
  { key: 'material', label: 'Material', type: 'text', required: false },
  { key: 'condition', label: 'Condition', type: 'select', required: false, options: ['new', 'like new', 'good', 'fair'] },
]

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  clothes: 'Clothing',
  clothing: 'Clothing',
}

export function fieldsForProductType(name: string, fields: ProductFieldDefinition[]): ProductFieldDefinition[] {
  return /^(clothes|clothing)$/i.test(name) ? CLOTHING_PRODUCT_SCHEMA : fields
}

export function productTypeLabel(name: string): string {
  return PRODUCT_TYPE_LABELS[name.toLowerCase()] ?? name
}
