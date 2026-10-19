import { useEffect, useState, type FormEvent } from 'react'
import { ImagePlus, LoaderCircle, PackagePlus, Save } from 'lucide-react'
import { CLOTHING_COMPATIBILITY, GARMENT_TYPES, SLEEVE_TYPES } from '../config/clothingCompatibility'
import { fieldsForProductType, productTypeLabel } from '../config/productSchemas'
import { uploadAsset, uploadAssetFile, validateProductAttributes } from '../lib/catalog'
import type { Product, ProductFieldDefinition, ProductType, ProductVariant } from '../types'
import PhotoListEditor from './PhotoListEditor'
import ProductFieldInput from './ProductFieldInput'
import ProductVariantsEditor from './ProductVariantsEditor'

type ProductEditorProps = {
  productTypes: ProductType[]
  product?: Product
  onSave: (product: Product) => Promise<void>
  onCancel: () => void
  onCreateType: () => void
  onSaved: (message: string) => void
}

type ProductDraft = {
  type_id: string
  name: string
  price: string
  discountPrice: string
  stock: string
  sku: string
  tags: string
  description: string
  brand: string
  status: 'draft' | 'published'
  attributes: Record<string, unknown>
  commonImages: string[]
  variants: ProductVariant[]
}

function newSku(): string {
  return `THR-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
}

function createDraft(product?: Product, defaultTypeId = ''): ProductDraft {
  return {
    type_id: product?.type_id ?? defaultTypeId,
    name: product?.name ?? '',
    price: product ? String(product.price) : '',
    discountPrice: product?.discount_price ? String(product.discount_price) : '',
    stock: product?.stock_quantity !== undefined ? String(product.stock_quantity) : '0',
    sku: product?.sku || newSku(),
    tags: product?.tags?.join(', ') ?? '',
    description: product?.description ?? '',
    brand: product?.brand ?? '',
    status: product?.status ?? (product ? product.active === false ? 'draft' : 'published' : 'draft'),
    attributes: product?.attributes ?? (product ? { category: product.category, sizes: product.sizes } : {}),
    commonImages: product?.common_images?.length ? [...product.common_images] : product?.image_url ? [product.image_url] : [],
    variants: product?.variants?.length
      ? product.variants.map((variant) => ({ ...variant, images: [...variant.images] }))
      : product?.colors.map(({ name, hex }) => ({ color_name: name, color_hex: hex, stock: 0, images: [] })) ?? [],
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    const message = error.message
    if (message.includes('schema cache') || message.includes('column') && message.includes('does not exist')) {
      return `${message} Apply sql/07-dynamic-product-types.sql and sql/08-product-management-fields.sql in Supabase, then try again.`
    }
    return message
  }
  return 'Could not save product. Please try again.'
}

function isClothing(name: string): boolean {
  return /^(clothes|clothing)$/i.test(name)
}

function clothingChoices(field: ProductFieldDefinition, attributes: Record<string, unknown>): string[] {
  if (field.key === 'garment_type') {
    const sleeve = attributes.sleeve_type
    return typeof sleeve === 'string' && sleeve ? CLOTHING_COMPATIBILITY[sleeve] ?? [] : GARMENT_TYPES
  }
  if (field.key === 'sleeve_type') {
    const garment = attributes.garment_type
    return typeof garment === 'string' && garment
      ? SLEEVE_TYPES.filter((sleeve) => CLOTHING_COMPATIBILITY[sleeve].includes(garment))
      : SLEEVE_TYPES
  }
  return field.options ?? []
}

function errorForField(field: ProductFieldDefinition, errors: string[]): string {
  return errors.find((error) => error.startsWith(`${field.label} `)) ?? ''
}

export default function ProductEditor({ productTypes, product, onSave, onCancel, onCreateType, onSaved }: ProductEditorProps) {
  const [draft, setDraft] = useState(() => createDraft(product, productTypes[0]?.id))
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [compatibilityNotice, setCompatibilityNotice] = useState('')
  const selectedType = productTypes.find((type) => type.id === draft.type_id)
  const fields = selectedType ? fieldsForProductType(selectedType.name, selectedType.fields) : []
  const clothing = Boolean(selectedType && isClothing(selectedType.name))

  useEffect(() => setDraft(createDraft(product, productTypes[0]?.id)), [product, productTypes])

  async function addSharedPhotos(files: File[]) {
    if (!files.length) return
    setBusy(true)
    setErrors([])
    try {
      const urls = await Promise.all(files.map((file) => uploadAsset(file, 'products')))
      setDraft((current) => ({ ...current, commonImages: [...current.commonImages, ...urls] }))
    } catch (uploadError) {
      setErrors([errorMessage(uploadError)])
    } finally {
      setBusy(false)
    }
  }

  async function addVariantPhotos(index: number, files: File[]) {
    if (!files.length) return
    setBusy(true)
    setErrors([])
    try {
      const uploaded = await Promise.all(files.map((file) => uploadAssetFile(file, 'products')))
      setDraft((current) => ({
        ...current,
        variants: current.variants.map((variant, variantIndex) => variantIndex === index
          ? { ...variant, images: [...variant.images, ...uploaded.map(({ path }) => path)] }
          : variant),
      }))
    } catch (uploadError) {
      setErrors([errorMessage(uploadError)])
    } finally {
      setBusy(false)
    }
  }

  function updateAttribute(key: string, value: unknown) {
    const nextAttributes = { ...draft.attributes, [key]: value }
    let resetKey: string | null = null
    if (clothing && (key === 'garment_type' || key === 'sleeve_type')) {
      const otherKey = key === 'garment_type' ? 'sleeve_type' : 'garment_type'
      const currentOther = nextAttributes[otherKey]
      const compatible = !value
        ? key === 'garment_type' ? SLEEVE_TYPES : GARMENT_TYPES
        : key === 'garment_type'
          ? SLEEVE_TYPES.filter((sleeve) => CLOTHING_COMPATIBILITY[sleeve].includes(String(value)))
          : CLOTHING_COMPATIBILITY[String(value)] ?? []
      if (typeof currentOther === 'string' && currentOther && !compatible.includes(currentOther)) {
        nextAttributes[otherKey] = ''
        resetKey = otherKey
      }
    }
    setCompatibilityNotice(resetKey
      ? `Selection updated. Choose a compatible ${resetKey === 'sleeve_type' ? 'sleeve type' : 'garment type'}.`
      : '')
    setDraft((current) => ({ ...current, attributes: nextAttributes }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const status = draft.status
    const isPublished = status === 'published'
    setErrors([])
    setFieldErrors({})
    if (!selectedType) {
      setErrors(['Choose a product type.'])
      return
    }

    const enteredVariants = draft.variants.filter((variant) => variant.color_name.trim() || variant.images.length > 0)
    const validationErrors = validateProductAttributes(
      fields.map((field) => ({ ...field, required: false })),
      draft.attributes,
    )
    const nextFieldErrors: Record<string, string> = {}
    for (const field of fields) {
      const error = errorForField(field, validationErrors)
      if (error) nextFieldErrors[field.key] = error
    }
    const nextErrors = [...validationErrors]
    const price = Number(draft.price)
    const discountPrice = draft.discountPrice ? Number(draft.discountPrice) : null
    const stock = Number(draft.stock)
    if (draft.price && (!Number.isFinite(price) || price < 0)) nextErrors.push('Enter a valid price.')
    if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice < 0 || discountPrice >= price)) {
      nextErrors.push('Discount price must be lower than the regular price.')
    }
    if (!Number.isInteger(stock) || stock < 0) nextErrors.push('Stock quantity must be zero or more.')
    if (clothing) {
      const garment = draft.attributes.garment_type
      const sleeve = draft.attributes.sleeve_type
      if (typeof garment === 'string' && garment && typeof sleeve === 'string' && sleeve
        && !CLOTHING_COMPATIBILITY[sleeve]?.includes(garment)) {
        nextErrors.push('Choose a compatible garment and sleeve type.')
      }
    }
    for (const [index, variant] of enteredVariants.entries()) {
      if (!variant.color_name.trim() || !/^#[0-9a-f]{6}$/i.test(variant.color_hex)) {
        nextErrors.push(`Color ${index + 1}: enter a recognized color name or HEX value.`)
      } else if (isPublished && !variant.images.length) {
        nextErrors.push(`Color ${index + 1}: add at least one photo.`)
      }
    }
    setFieldErrors(nextFieldErrors)
    if (nextErrors.length) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    try {
      const garment = draft.attributes.garment_type
      const sizes = draft.attributes.sizes
      await onSave({
        id: product?.id ?? crypto.randomUUID(),
        name: draft.name.trim() || `${productTypeLabel(selectedType.name)} item`,
        description: draft.description.trim(),
        price: draft.price.trim() ? price : 0,
        discount_price: discountPrice,
        stock_quantity: stock,
        sku: draft.sku.trim(),
        tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        status,
        active: status === 'published',
        brand: draft.brand.trim() || null,
        condition: typeof draft.attributes.condition === 'string' ? draft.attributes.condition : null,
        category: typeof garment === 'string' && garment ? garment : productTypeLabel(selectedType.name),
        type_id: selectedType.id || null,
        attributes: draft.attributes,
        image_url: draft.commonImages[0] ?? '',
        common_images: draft.commonImages,
        sizes: Array.isArray(sizes) ? sizes.filter((size): size is string => typeof size === 'string') : [],
        variants: enteredVariants.map((variant) => ({
          ...variant,
          color_name: variant.color_name.trim(),
          color_hex: variant.color_hex.toLowerCase(),
        })),
        colors: enteredVariants.map(({ color_name, color_hex }) => ({ name: color_name.trim(), hex: color_hex.toLowerCase() })),
      })
      onSaved(status === 'published' ? 'Product published.' : 'Product saved as a draft.')
      if (product) onCancel()
      else setDraft(createDraft(undefined, selectedType.id))
    } catch (saveError) {
      setErrors([errorMessage(saveError)])
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    if (product && !window.confirm('Discard changes and restore this product?')) return
    setDraft(createDraft(product, productTypes[0]?.id))
    setErrors([])
    setFieldErrors({})
    setCompatibilityNotice('')
  }

  return (
      <form className="admin-card stack-form product-editor" onSubmit={(event) => void submit(event)}>
        <div className="card-title"><h2>{product ? 'Edit product' : 'Add a product'}</h2><PackagePlus size={18} /></div>
        {productTypes.length === 0 ? <>
          <p className="muted">Create a product type first. This tells the form which details to ask for.</p>
          <button type="button" className="button button-primary" onClick={onCreateType}>Create a product type</button>
        </> : <>
          <label>Product type<select value={draft.type_id} onChange={(event) => setDraft((current) => ({ ...current, type_id: event.target.value, attributes: {} }))}>
            <option value="">Choose a product type</option>
            {productTypes.map((type) => <option key={type.id} value={type.id}>{productTypeLabel(type.name)}</option>)}
          </select></label>
          <label>Name<input maxLength={120} placeholder="e.g. Vintage black sunglasses" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
          <div className="form-row">
            <label>Price<input type="number" min="0" step="0.01" placeholder="0.00" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
            <label>Discount price<input type="number" min="0" step="0.01" placeholder="Optional" value={draft.discountPrice} onChange={(event) => setDraft((current) => ({ ...current, discountPrice: event.target.value }))} /></label>
          </div>
          <label>Description <span className="label-hint">Optional</span><textarea rows={2} placeholder="A short note about this item" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
          <details className="optional-product-section">
            <summary>More product details <span>Brand, SKU and tags</span></summary>
            <label>Brand<input value={draft.brand} onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))} /></label>
            <div className="form-row">
              <label>Stock quantity<input type="number" min="0" step="1" value={draft.stock} onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))} /></label>
              <label>SKU<input readOnly value={draft.sku} /></label>
            </div>
            <label>Tags <span className="label-hint">Separate with commas</span><input placeholder="vintage, summer" value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} /></label>
          </details>

          {selectedType && fields.map((field) => {
            const clothingLinked = clothing && (field.key === 'garment_type' || field.key === 'sleeve_type')
            return <div className="product-field-wrap" key={field.key}>
              {clothingLinked ? <label>{field.label}
                <select value={String(draft.attributes[field.key] ?? '')} onChange={(event) => updateAttribute(field.key, event.target.value)}>
                  <option value="">Choose {field.label.toLowerCase()}</option>
                  {clothingChoices(field, draft.attributes).map((option) => <option key={option}>{option}</option>)}
                </select>
              </label> : <ProductFieldInput field={field} value={draft.attributes[field.key]} onChange={(value) => updateAttribute(field.key, value)} />}
              {fieldErrors[field.key] && <span className="inline-error">{fieldErrors[field.key]}</span>}
            </div>
          })}
          {compatibilityNotice && <p className="compatibility-notice" role="status">{compatibilityNotice}</p>}

          <details className="optional-product-section">
            <summary>Common photos <span>Optional · shared across colors</span></summary>
            <label className="upload-button"><ImagePlus size={15} /> Add common photos
              <input type="file" accept="image/*" multiple disabled={busy} onChange={(event) => void addSharedPhotos(Array.from(event.target.files ?? []))} />
            </label>
            <PhotoListEditor photos={draft.commonImages} label="Product photo" onChange={(commonImages) => setDraft((current) => ({ ...current, commonImages }))} />
          </details>
          <ProductVariantsEditor
            variants={draft.variants}
            busy={busy}
            onChange={(variants) => setDraft((current) => ({ ...current, variants }))}
            onUpload={(index, files) => void addVariantPhotos(index, files)}
          />
        </>}
        {errors.length > 0 && <div className="form-error-list" role="alert">{errors.map((error, index) => <p key={`${error}-${index}`}>{error}</p>)}</div>}
        {productTypes.length > 0 && <div className="form-actions form-actions-wrap">
          <label>Status<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value === 'published' ? 'published' : 'draft' }))}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select></label>
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={16} /> : <Save size={15} />} Save product
          </button>
          <button className="button button-quiet" type="button" onClick={reset}>Reset</button>
          {product && <button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button>}
        </div>}
      </form>
  )
}
