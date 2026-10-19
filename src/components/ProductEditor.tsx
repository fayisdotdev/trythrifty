import { useEffect, useState, type FormEvent } from 'react'
import { ImagePlus, LoaderCircle, PackagePlus, Save, Trash2 } from 'lucide-react'
import { uploadAsset, uploadAssetFile, validateProductAttributes } from '../lib/catalog'
import type { Product, ProductType, ProductVariant } from '../types'
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
  description: string
  brand: string
  condition: string
  attributes: Record<string, unknown>
  commonImages: string[]
  variants: ProductVariant[]
  autoGenerate: boolean
}

function createDraft(product?: Product, defaultTypeId = ''): ProductDraft {
  return {
    type_id: product?.type_id ?? defaultTypeId,
    name: product?.name ?? '',
    price: product ? String(product.price) : '',
    description: product?.description ?? '',
    brand: product?.brand ?? '',
    condition: product?.condition ?? '',
    attributes: product?.attributes ?? (product ? { category: product.category, sizes: product.sizes.join(', ') } : {}),
    commonImages: product?.common_images?.length ? [...product.common_images] : product?.image_url ? [product.image_url] : [],
    variants: product?.variants?.length
      ? product.variants.map((variant) => ({ ...variant, images: [...variant.images] }))
      : product?.colors.map(({ name, hex }) => ({ color_name: name, color_hex: hex, stock: 0, images: [] })) ?? [],
    autoGenerate: false,
  }
}

export default function ProductEditor({ productTypes, product, onSave, onCancel, onCreateType, onSaved }: ProductEditorProps) {
  const [draft, setDraft] = useState(() => createDraft(product, productTypes[0]?.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectedType = productTypes.find((type) => type.id === draft.type_id)

  useEffect(() => setDraft(createDraft(product, productTypes[0]?.id)), [product, productTypes])

  async function addSharedPhotos(files: File[]) {
    if (!files.length) return
    setBusy(true)
    setError('')
    try {
      const urls = await Promise.all(files.map((file) => uploadAsset(file, 'products')))
      setDraft((current) => ({ ...current, commonImages: [...current.commonImages, ...urls] }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload product photos.')
    } finally {
      setBusy(false)
    }
  }

  async function addVariantPhotos(index: number, files: File[]) {
    if (!files.length) return
    setBusy(true)
    setError('')
    try {
      const uploaded = await Promise.all(files.map((file) => uploadAssetFile(file, 'products')))
      setDraft((current) => ({
        ...current,
        variants: current.variants.map((variant, variantIndex) => variantIndex === index
          ? { ...variant, images: [...variant.images, ...uploaded.map(({ path }) => path)] }
          : variant),
      }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload color photos.')
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!selectedType) throw new Error('Choose a product type.')
      const attributeErrors = validateProductAttributes(selectedType.fields, draft.attributes)
      if (attributeErrors.length) throw new Error(attributeErrors.join(' '))
      const invalidVariant = draft.variants.find((variant) =>
        !variant.color_name.trim()
        || !/^#[0-9a-f]{6}$/i.test(variant.color_hex),
      )
      if (invalidVariant) {
        throw new Error('Enter a recognized color name or HEX value for each color option.')
      }

      const category = draft.attributes.category
      const sizes = draft.attributes.sizes
      await onSave({
        id: product?.id ?? crypto.randomUUID(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: Number(draft.price),
        brand: draft.brand.trim() || null,
        condition: draft.condition.trim() || null,
        category: typeof category === 'string' && category.trim() ? category.trim() : selectedType.name,
        type_id: selectedType.id,
        attributes: draft.attributes,
        image_url: draft.commonImages[0] ?? '',
        common_images: draft.commonImages,
        sizes: typeof sizes === 'string' ? sizes.split(',').map((size) => size.trim()).filter(Boolean) : [],
        variants: draft.variants.map((variant) => ({
          ...variant,
          color_name: variant.color_name.trim(),
          color_hex: variant.color_hex.toLowerCase(),
        })),
        colors: draft.variants.map(({ color_name, color_hex }) => ({ name: color_name.trim(), hex: color_hex.toLowerCase() })),
        active: product?.active ?? true,
      })
      onSaved(product ? 'Product updated.' : 'Product added to your shop.')
      if (product) onCancel()
      else setDraft(createDraft(undefined, selectedType.id))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save product.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-card stack-form product-editor" onSubmit={(event) => void submit(event)}>
      <div className="card-title"><h2>{product ? 'Edit product' : 'Add a product'}</h2><PackagePlus size={18} /></div>
      {productTypes.length === 0 ? <>
        <p className="muted">Create a product type first. This tells the form which details to ask for.</p>
        <button type="button" className="button button-primary" onClick={onCreateType}>Create a product type</button>
      </> : <>
        <label>What are you adding?<select required value={draft.type_id} onChange={(event) => setDraft((current) => ({ ...current, type_id: event.target.value, attributes: {} }))}>
          <option value="">Choose a product type</option>
          {productTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select></label>
        <label>Product name<input required maxLength={120} placeholder="e.g. Vintage black sunglasses" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
        <label>Price<input type="number" min="0" step="0.01" required placeholder="0.00" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
        <label>Description <span className="label-hint">Optional</span><textarea rows={2} placeholder="A short note about this item" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
        <details className="optional-product-section">
          <summary>Brand and condition <span>Optional</span></summary>
          <label>Brand<input value={draft.brand} onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))} /></label>
          <label>Condition<input value={draft.condition} onChange={(event) => setDraft((current) => ({ ...current, condition: event.target.value }))} /></label>
        </details>

        {selectedType && <>
          {selectedType.fields.filter((field) => !field.hidden).map((field) => (
            <ProductFieldInput key={field.key} field={field} value={draft.attributes[field.key]} onChange={(value) => setDraft((current) => ({ ...current, attributes: { ...current.attributes, [field.key]: value } }))} />
          ))}
          <label className="upload-button"><ImagePlus size={15} /> Add product photos
            <input type="file" accept="image/*" multiple disabled={busy} onChange={(event) => void addSharedPhotos(Array.from(event.target.files ?? []))} />
          </label>
          {draft.commonImages.length > 0 && <div className="image-preview-list">
            {draft.commonImages.map((image, index) => <div className="image-preview-item" key={`${image}-${index}`}>
              <img className="admin-image-preview" src={image} alt={`Product photo ${index + 1}`} />
              <button type="button" className="icon-button danger-button" aria-label="Remove product photo" onClick={() => setDraft((current) => ({ ...current, commonImages: current.commonImages.filter((_, photoIndex) => photoIndex !== index) }))}><Trash2 size={13} /></button>
            </div>)}
          </div>}

          <ProductVariantsEditor
            variants={draft.variants}
            autoGenerate={draft.autoGenerate}
            busy={busy}
            onChange={(variants) => setDraft((current) => ({ ...current, variants }))}
            onAutoGenerateChange={(autoGenerate) => setDraft((current) => ({ ...current, autoGenerate }))}
            onUpload={(index, files) => void addVariantPhotos(index, files)}
          />
        </>}
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {productTypes.length > 0 && <div className="form-actions">
        <button className="button button-primary" disabled={busy || !selectedType}>
          {busy ? <LoaderCircle className="spin" size={16} /> : <Save size={15} />}
          {product ? 'Save product' : 'Add product'}
        </button>
        {product && <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>}
      </div>}
    </form>
  )
}
