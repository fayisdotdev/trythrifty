import type { Product, ProductFieldDefinition, ProductType, ProductVariant, StoreSettings } from '../types'
import { supabase } from './supabase'

export function productSalePrice(product: Pick<Product, 'price' | 'discount_price'>): number {
  return product.discount_price !== null
    && product.discount_price !== undefined
    && product.discount_price >= 0
    && product.discount_price < product.price
    ? product.discount_price
    : product.price
}

export async function loadStorefront(): Promise<{ products: Product[]; productTypes: ProductType[]; settings: StoreSettings }> {
  if (!supabase) throw new Error('Connect Supabase before loading storefront content.')

  const [productsResult, typesResult, settingsResult] = await Promise.all([
    supabase
      .from('trythrifty_products')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase.from('trythrifty_product_types').select('*').order('name'),
    supabase.from('trythrifty_store_settings').select('*').eq('id', 1).maybeSingle(),
  ])

  if (productsResult.error) throw productsResult.error
  if (typesResult.error) throw typesResult.error
  if (settingsResult.error) throw settingsResult.error

  if (!settingsResult.data) throw new Error('Storefront settings have not been configured in Supabase.')

  const rows = productsResult.data ?? []
  const variantsResult = rows.length
    ? await supabase.from('trythrifty_product_variants').select('*').in('product_id', rows.map(({ id }) => id))
    : { data: [], error: null }
  if (variantsResult.error) throw variantsResult.error
  const variantsByProduct = new Map<string, ProductVariant[]>()
  for (const variant of (variantsResult.data ?? []) as ProductVariant[]) {
    const current = variantsByProduct.get(variant.product_id ?? '') ?? []
    current.push(variant)
    variantsByProduct.set(variant.product_id ?? '', current)
  }

  return {
    products: rows.map((row) => {
      const product = row as Product
      const variants = variantsByProduct.get(product.id) ?? []
      return {
        ...product,
        attributes: product.attributes ?? {},
        status: product.status ?? (product.active ? 'published' : 'draft'),
        tags: product.tags ?? [],
        common_images: product.common_images?.length ? product.common_images : [product.image_url].filter(Boolean),
        variants,
        colors: variants.length
          ? variants.map(({ color_name, color_hex }) => ({ name: color_name, hex: color_hex }))
          : product.colors ?? [],
      }
    }),
    productTypes: (typesResult.data ?? []) as ProductType[],
    settings: settingsResult.data as StoreSettings,
  }
}

export function validateProductAttributes(
  fields: ProductFieldDefinition[],
  attributes: Record<string, unknown>,
): string[] {
  const errors: string[] = []
  for (const field of fields) {
    if (field.hidden) continue
    const value = attributes[field.key]
    const empty = value === undefined
      || value === null
      || value === ''
      || (typeof value === 'string' && !value.trim())
      || (Array.isArray(value) && value.length === 0)
    if (field.required && empty) {
      errors.push(`${field.label} is required.`)
      continue
    }
    if (empty) continue
    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') errors.push(`${field.label} must be text.`)
        break
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${field.label} must be a valid number.`)
        break
      case 'boolean':
        if (typeof value !== 'boolean') errors.push(`${field.label} must be true or false.`)
        break
      case 'select':
        if (typeof value !== 'string' || !field.options?.includes(value)) errors.push(`${field.label} must be one of its listed options.`)
        break
      case 'multi_select':
        if (!Array.isArray(value) || value.some((option) => typeof option !== 'string' || !field.options?.includes(option))) {
          errors.push(`${field.label} contains an invalid option.`)
        }
        break
      case 'color':
        if (typeof value !== 'string' || !value.trim()
          || (!/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value) && !(typeof CSS !== 'undefined' && CSS.supports('color', value)))) {
          errors.push(`${field.label} must be a recognized color name or HEX value.`)
        }
        break
    }
  }
  return errors
}

export async function uploadAsset(file: File, folder: 'products' | 'brand'): Promise<string> {
  return (await uploadAssetFile(file, folder)).url
}

export async function uploadAssetFile(file: File, folder: 'products' | 'brand'): Promise<{ path: string; url: string }> {
  if (!supabase) throw new Error('Connect Supabase before uploading assets.')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from('trythrifty-assets').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('trythrifty-assets').getPublicUrl(path)
  return { path, url: data.publicUrl }
}

export function publicAssetUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (!supabase) throw new Error('Connect Supabase before loading product variant images.')
  return supabase.storage.from('trythrifty-assets').getPublicUrl(pathOrUrl).data.publicUrl
}
