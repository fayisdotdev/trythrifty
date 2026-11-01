import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ImagePlus, LoaderCircle, PackagePlus, Save, Settings2, Trash2 } from 'lucide-react'
import { uploadAsset } from '../lib/catalog'
import type { Product, ProductColor, StoreSettings } from '../types'

type AdminPanelProps = {
  products: Product[]
  settings: StoreSettings
  theme: 'light' | 'dark'
  onBack: () => void
  onSaveSettings: (settings: StoreSettings) => Promise<void>
  onSaveProduct: (product: Product) => Promise<void>
  onDeleteProduct: (productId: string) => Promise<void>
}

type ProductForm = {
  name: string
  description: string
  price: string
  category: string
  image_url: string
  sizes: string
  colors: ProductColor[]
}

const emptyProduct: ProductForm = {
  name: '', description: '', price: '', category: '', image_url: '', sizes: '', colors: [],
}

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One size']
const colorPresets: ProductColor[] = [
  { name: 'Black', hex: '#171717' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Red', hex: '#e53935' },
  { name: 'Blue', hex: '#2878c7' },
  { name: 'Navy', hex: '#1f3a5f' },
  { name: 'Green', hex: '#31845b' },
  { name: 'Yellow', hex: '#f2c230' },
  { name: 'Pink', hex: '#e88ca9' },
  { name: 'Purple', hex: '#8055a5' },
  { name: 'Brown', hex: '#795548' },
  { name: 'Grey', hex: '#858585' },
  { name: 'Beige', hex: '#d8c3a5' },
]

function productToForm(product: Product): ProductForm {
  return {
    name: product.name,
    description: product.description,
    price: String(product.price),
    category: product.category,
    image_url: product.image_url,
    sizes: product.sizes.join(', '),
    colors: product.colors.map(({ name, hex }) => ({ name, hex })),
  }
}

export default function AdminPanel({ products, settings, theme, onBack, onSaveSettings, onSaveProduct, onDeleteProduct }: AdminPanelProps) {
  const [section, setSection] = useState<'products' | 'brand'>('products')
  const [draft, setDraft] = useState<ProductForm>(emptyProduct)
  const [addingCategory, setAddingCategory] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [settingsDraft, setSettingsDraft] = useState(settings)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => setSettingsDraft(settings), [settings])

  function startEdit(product: Product) {
    setDraft(productToForm(product))
    setEditingId(product.id)
    setAddingCategory(false)
    setSection('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setDraft(emptyProduct)
    setEditingId(null)
    setAddingCategory(false)
  }

  async function uploadImage(file: File, folder: 'products' | 'brand', settingsField?: 'logo_light_url' | 'logo_dark_url' | 'favicon_url' | 'hero_image_url') {
    setBusy(true)
    setError('')
    try {
      const url = await uploadAsset(file, folder)
      if (folder === 'products') setDraft((current) => ({ ...current, image_url: url }))
      else if (settingsField) setSettingsDraft((current) => ({ ...current, [settingsField]: url }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Asset upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const colors = draft.colors
        .map(({ name, hex }) => ({ name: name.trim(), hex }))
        .filter(({ name }) => name)
      await onSaveProduct({
        id: editingId ?? crypto.randomUUID(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: Number(draft.price),
        category: draft.category.trim(),
        image_url: draft.image_url.trim(),
        sizes: draft.sizes.split(',').map((size) => size.trim()).filter(Boolean),
        colors,
        active: true,
      })
      setSuccess(editingId ? 'Product updated.' : 'Product added to the shop.')
      cancelEdit()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save product.')
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await onSaveSettings(settingsDraft)
      setSuccess('Storefront settings saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save settings.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Remove "${product.name}" from the shop?`)) return
    setError('')
    setSuccess('')
    try {
      await onDeleteProduct(product.id)
      setSuccess('Product removed.')
      if (editingId === product.id) cancelEdit()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove product.')
    }
  }

  const updateProduct = (field: Exclude<keyof ProductForm, 'colors'>, value: string) => setDraft((current) => ({ ...current, [field]: value }))
  const updateProductColor = (index: number, patch: Partial<ProductColor>) => setDraft((current) => ({
    ...current,
    colors: current.colors.map((color, colorIndex) => colorIndex === index ? { ...color, ...patch } : color),
  }))
  const addProductColor = (color: ProductColor) => setDraft((current) => ({ ...current, colors: [...current.colors, { ...color }] }))
  const updateSetting = <K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) => setSettingsDraft((current) => ({ ...current, [field]: value }))
  const categories = [...new Map(
    products.map((product) => product.category.trim()).filter(Boolean).map((category) => [category.toLowerCase(), category]),
  ).values()]
  if (draft.category.trim() && !categories.some((category) => category.toLowerCase() === draft.category.trim().toLowerCase())) categories.push(draft.category.trim())
  categories.sort((left, right) => left.localeCompare(right))
  const selectedSizes = draft.sizes.split(',').map((size) => size.trim()).filter(Boolean)
  const sizeOptions = [...standardSizes, ...selectedSizes.filter((size) => !standardSizes.some((standardSize) => standardSize.toLowerCase() === size.toLowerCase()))]
  const lightLogoUrl = (settingsDraft.logo_light_url ?? settingsDraft.logo_url?.trim())
    || `${import.meta.env.BASE_URL}logos/try-thrifty-primary-black.png`
  const darkLogoUrl = (settingsDraft.logo_dark_url ?? settingsDraft.logo_url?.trim())
    || `${import.meta.env.BASE_URL}logos/try-thrifty-primary-white.png`

  return (
    <main className="admin-shell" data-store-theme={theme}>
      <aside className="admin-sidebar">
        <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> View storefront</button>
        <div className="admin-brand"><img src={theme === 'dark' ? `${import.meta.env.BASE_URL}logos/try-thrifty-primary-white.png` : `${import.meta.env.BASE_URL}logos/try-thrifty-primary-black.png`} alt="trythrifty" /><div><small>STORE MANAGEMENT</small></div></div>
        <nav aria-label="Admin sections">
          <button className={section === 'products' ? 'active' : ''} onClick={() => setSection('products')}><PackagePlus size={17} /> Products <span>{products.length}</span></button>
          <button className={section === 'brand' ? 'active' : ''} onClick={() => setSection('brand')}><Settings2 size={17} /> Brand & storefront</button>
        </nav>
        <div className="admin-sidebar-note"><span className="status-dot" /> Changes publish to your storefront when saved.</div>
      </aside>
      <section className="admin-content">
        <header className="admin-topbar"><span className="eyebrow">ADMINISTRATOR</span><span className="admin-live"><span className="status-dot" /> Store management</span></header>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {success && <div className="admin-alert success" role="status">{success}</div>}

        {section === 'products' ? (
          <>
            <div className="admin-title-row"><div><span className="eyebrow">YOUR INVENTORY</span><h1>Products</h1><p className="muted">Add one-off pre-loved finds. Nothing is listed until you add it.</p></div><span className="count-pill">{products.length} listed</span></div>
            <div className="admin-grid">
              <form className="admin-card stack-form" onSubmit={submitProduct}>
                <div className="card-title"><h2>{editingId ? 'Edit product' : 'Add a product'}</h2><PackagePlus size={18} /></div>
                <label>Product name<input required maxLength={120} value={draft.name} onChange={(e) => updateProduct('name', e.target.value)} /></label>
                <div className="form-row">
                  <label>Price (INR)<input type="number" min="0" step="0.01" required value={draft.price} onChange={(e) => updateProduct('price', e.target.value)} /></label>
                  <label>Category
                    <select
                      required
                      value={addingCategory ? '__add_category__' : draft.category}
                      onChange={(e) => {
                        if (e.target.value === '__add_category__') {
                          setAddingCategory(true)
                          updateProduct('category', '')
                        } else {
                          setAddingCategory(false)
                          updateProduct('category', e.target.value)
                        }
                      }}
                    >
                      <option value="" disabled>Choose a category</option>
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                      <option value="__add_category__">＋ Add category…</option>
                    </select>
                  </label>
                </div>
                {addingCategory && <label>New category<input autoFocus required maxLength={60} placeholder="e.g. Sunglasses" value={draft.category} onChange={(e) => updateProduct('category', e.target.value)} /></label>}
                <label>Description<textarea rows={3} value={draft.description} onChange={(e) => updateProduct('description', e.target.value)} /></label>
                <fieldset className="size-fieldset">
                  <legend>Sizes <span className="label-hint">select all that apply</span></legend>
                  <div className="size-options">
                    {sizeOptions.map((size) => {
                      const checked = selectedSizes.some((selected) => selected.toLowerCase() === size.toLowerCase())
                      return <label className="size-option" key={size}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const nextSizes = checked
                              ? selectedSizes.filter((selected) => selected.toLowerCase() !== size.toLowerCase())
                              : [...selectedSizes, size]
                            updateProduct('sizes', nextSizes.join(', '))
                          }}
                        />
                        <span>{size}</span>
                      </label>
                    })}
                  </div>
                </fieldset>
                <fieldset className="product-colors-fieldset">
                  <legend>Colors <span className="label-hint">choose one or more; add shades separately</span></legend>
                  <div className="color-preset-list" aria-label="Common colors">
                    {colorPresets.map((color) => <button
                      className="color-preset"
                      key={color.name}
                      type="button"
                      title={`Add ${color.name}`}
                      onClick={() => addProductColor(color)}
                    >
                      <span style={{ backgroundColor: color.hex }} />
                      {color.name}
                    </button>)}
                    <button className="button button-quiet add-custom-color" type="button" onClick={() => addProductColor({ name: 'Custom color', hex: '#808080' })}>
                      + Custom shade
                    </button>
                  </div>
                  {draft.colors.length > 0 ? <div className="product-color-list">
                    {draft.colors.map((color, index) => <div className="product-color-row" key={index}>
                      <input
                        type="color"
                        aria-label={`Choose shade for ${color.name || `color ${index + 1}`}`}
                        value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : '#808080'}
                        onChange={(event) => updateProductColor(index, { hex: event.target.value })}
                      />
                      <input
                        aria-label={`Color ${index + 1} name`}
                        placeholder="Name this color or shade"
                        maxLength={40}
                        value={color.name}
                        onChange={(event) => updateProductColor(index, { name: event.target.value })}
                      />
                      <button
                        className="icon-button danger-button"
                        type="button"
                        aria-label={`Remove ${color.name || `color ${index + 1}`}`}
                        onClick={() => setDraft((current) => ({ ...current, colors: current.colors.filter((_, colorIndex) => colorIndex !== index) }))}
                      ><Trash2 size={15} /></button>
                    </div>)}
                  </div> : <p className="color-empty-hint">No colors added. Colors are optional.</p>}
                </fieldset>
                <label>Product image URL<input type="url" required placeholder="https://…" value={draft.image_url} onChange={(e) => updateProduct('image_url', e.target.value)} /></label>
                <label className="upload-button"><ImagePlus size={15} /> Upload product image<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], 'products')} /></label>
                {draft.image_url && <img className="admin-image-preview" src={draft.image_url} alt="Product preview" />}
                <div className="form-actions">
                  <button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Save size={15} />}{editingId ? 'Save changes' : 'Add product'}</button>
                  {editingId && <button type="button" className="button button-quiet" onClick={cancelEdit}>Cancel</button>}
                </div>
              </form>

              <div className="admin-card inventory-card">
                <div className="card-title"><h2>Live inventory</h2><span>{products.length} items</span></div>
                {products.length === 0 ? <div className="admin-empty"><PackagePlus size={26} /><strong>No products yet</strong><p>Add your first piece using the form.</p></div> : (
                  <div className="inventory-list">{products.map((product) => (
                    <article className="inventory-item" key={product.id}>
                      <img src={product.image_url} alt="" />
                      <div className="inventory-detail"><strong>{product.name}</strong><span>{product.category} · ₹{product.price.toLocaleString('en-IN')}</span></div>
                      <button className="icon-button" title="Edit product" onClick={() => startEdit(product)}>Edit</button>
                      <button className="icon-button danger-button" title="Remove product" onClick={() => void deleteProduct(product)}><Trash2 size={15} /></button>
                    </article>
                  ))}</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="admin-title-row"><div><span className="eyebrow">MAKE IT YOURS</span><h1>Brand & storefront</h1><p className="muted">Manage the shop identity, home page copy and WhatsApp contact.</p></div></div>
            <form className="admin-card settings-form stack-form" onSubmit={saveSettings}>
              <div className="card-title"><h2>Store identity</h2><Settings2 size={18} /></div>
              <label>Store name<input required value={settingsDraft.store_name} onChange={(e) => updateSetting('store_name', e.target.value)} /></label>
              <label>Storefront theme<select value={settingsDraft.theme === 'dark' ? 'dark' : 'light'} onChange={(e) => updateSetting('theme', e.target.value === 'dark' ? 'dark' : 'light')}>
                <option value="light">Red &amp; white — light</option>
                <option value="dark">Red &amp; black — dark</option>
              </select></label>
              <p className="muted theme-help">Choose a ready-made palette with matched text and background colors for comfortable reading.</p>
              <div className="brand-logo-option">
                <strong>Logo for light mode</strong>
                <label>Image URL<input type="url" placeholder="https://…" value={settingsDraft.logo_light_url ?? ''} onChange={(e) => updateSetting('logo_light_url', e.target.value)} /></label>
                <label className="upload-button"><ImagePlus size={15} /> Upload light logo<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], 'brand', 'logo_light_url')} /></label>
                <div className="brand-logo-preview light">
                  <img className="brand-image-preview" src={lightLogoUrl} alt="Light mode logo preview" />
                  <span>{settingsDraft.logo_light_url?.trim() ? 'Custom light logo' : 'Default black logo'}</span>
                </div>
              </div>
              <div className="brand-logo-option">
                <strong>Logo for dark mode</strong>
                <label>Image URL<input type="url" placeholder="https://…" value={settingsDraft.logo_dark_url ?? ''} onChange={(e) => updateSetting('logo_dark_url', e.target.value)} /></label>
                <label className="upload-button"><ImagePlus size={15} /> Upload dark logo<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], 'brand', 'logo_dark_url')} /></label>
                <div className="brand-logo-preview dark">
                  <img className="brand-image-preview" src={darkLogoUrl} alt="Dark mode logo preview" />
                  <span>{settingsDraft.logo_dark_url?.trim() ? 'Custom dark logo' : 'Default white logo'}</span>
                </div>
              </div>
              <label>Favicon URL<input type="url" placeholder="https://…" value={settingsDraft.favicon_url} onChange={(e) => updateSetting('favicon_url', e.target.value)} /></label>
              <label className="upload-button"><ImagePlus size={15} /> Upload favicon<input type="file" accept="image/*,.ico" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], 'brand', 'favicon_url')} /></label>
              <label>WhatsApp number <span className="label-hint">country code + number, digits only; India: 91…</span><input inputMode="tel" placeholder="919876543210" value={settingsDraft.whatsapp_number} onChange={(e) => updateSetting('whatsapp_number', e.target.value)} /></label>
              <div className="settings-divider" />
              <div className="card-title"><h2>Navigation & search</h2></div>
              <div className="form-row">
                <label>Home link<input value={settingsDraft.nav_home_label} onChange={(e) => updateSetting('nav_home_label', e.target.value)} /></label>
                <label>Collection link<input value={settingsDraft.nav_collection_label} onChange={(e) => updateSetting('nav_collection_label', e.target.value)} /></label>
              </div>
              <label>Story link<input value={settingsDraft.nav_story_label} onChange={(e) => updateSetting('nav_story_label', e.target.value)} /></label>
              <label>Search placeholder<input value={settingsDraft.search_placeholder} onChange={(e) => updateSetting('search_placeholder', e.target.value)} /></label>
              <div className="settings-divider" />
              <div className="card-title"><h2>Hero section</h2></div>
              <label>Eyebrow<input value={settingsDraft.hero_eyebrow} onChange={(e) => updateSetting('hero_eyebrow', e.target.value)} /></label>
              <label>Hero headline<input required value={settingsDraft.hero_title} onChange={(e) => updateSetting('hero_title', e.target.value)} /></label>
              <label>Hero description<textarea rows={3} value={settingsDraft.hero_description} onChange={(e) => updateSetting('hero_description', e.target.value)} /></label>
              <label>Hero button label<input value={settingsDraft.hero_cta_label} onChange={(e) => updateSetting('hero_cta_label', e.target.value)} /></label>
              <div className="form-row">
                <label>First feature<input value={settingsDraft.hero_feature_one} onChange={(e) => updateSetting('hero_feature_one', e.target.value)} /></label>
                <label>Second feature<input value={settingsDraft.hero_feature_two} onChange={(e) => updateSetting('hero_feature_two', e.target.value)} /></label>
              </div>
              <label>Hero image URL<input type="url" placeholder="https://…" value={settingsDraft.hero_image_url} onChange={(e) => updateSetting('hero_image_url', e.target.value)} /></label>
              <label className="upload-button"><ImagePlus size={15} /> Upload hero image<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], 'brand', 'hero_image_url')} /></label>
              {settingsDraft.hero_image_url && <img className="brand-image-preview" src={settingsDraft.hero_image_url} alt="Hero preview" />}
              <label>Hero artwork label<input value={settingsDraft.hero_art_eyebrow} onChange={(e) => updateSetting('hero_art_eyebrow', e.target.value)} /></label>
              <label>Hero artwork title <span className="label-hint">line breaks are preserved</span><textarea rows={2} value={settingsDraft.hero_art_title} onChange={(e) => updateSetting('hero_art_title', e.target.value)} /></label>
              <label>Hero artwork subtitle<input value={settingsDraft.hero_art_subtitle} onChange={(e) => updateSetting('hero_art_subtitle', e.target.value)} /></label>
              <label>Hero artwork stamp <span className="label-hint">line breaks are preserved</span><textarea rows={2} value={settingsDraft.hero_art_stamp} onChange={(e) => updateSetting('hero_art_stamp', e.target.value)} /></label>
              <label>Hero artwork footer <span className="label-hint">line breaks are preserved</span><textarea rows={2} value={settingsDraft.hero_art_footer} onChange={(e) => updateSetting('hero_art_footer', e.target.value)} /></label>
              <label>Hero index label<input value={settingsDraft.hero_index_label} onChange={(e) => updateSetting('hero_index_label', e.target.value)} /></label>
              <div className="settings-divider" />
              <div className="card-title"><h2>Collection section</h2></div>
              <label>Section label<input value={settingsDraft.collection_eyebrow} onChange={(e) => updateSetting('collection_eyebrow', e.target.value)} /></label>
              <div className="form-row">
                <label>Heading, first line<input value={settingsDraft.collection_title} onChange={(e) => updateSetting('collection_title', e.target.value)} /></label>
                <label>Heading, second line<input value={settingsDraft.collection_title_emphasis} onChange={(e) => updateSetting('collection_title_emphasis', e.target.value)} /></label>
              </div>
              <label>Description<input value={settingsDraft.collection_description} onChange={(e) => updateSetting('collection_description', e.target.value)} /></label>
              <div className="form-row">
                <label>Single item label<input value={settingsDraft.collection_item_label} onChange={(e) => updateSetting('collection_item_label', e.target.value)} /></label>
                <label>Multiple items label<input value={settingsDraft.collection_items_label} onChange={(e) => updateSetting('collection_items_label', e.target.value)} /></label>
              </div>
              <label>All categories filter label<input value={settingsDraft.collection_all_label} onChange={(e) => updateSetting('collection_all_label', e.target.value)} /></label>
              <div className="card-title"><h2>Empty collection messages</h2></div>
              <label>Empty collection label<input value={settingsDraft.empty_collection_eyebrow} onChange={(e) => updateSetting('empty_collection_eyebrow', e.target.value)} /></label>
              <label>Empty collection heading<input value={settingsDraft.empty_collection_title} onChange={(e) => updateSetting('empty_collection_title', e.target.value)} /></label>
              <label>Empty collection description<textarea rows={2} value={settingsDraft.empty_collection_description} onChange={(e) => updateSetting('empty_collection_description', e.target.value)} /></label>
              <label>No search matches label<input value={settingsDraft.no_matches_eyebrow} onChange={(e) => updateSetting('no_matches_eyebrow', e.target.value)} /></label>
              <label>No search matches heading<input value={settingsDraft.no_matches_title} onChange={(e) => updateSetting('no_matches_title', e.target.value)} /></label>
              <label>No search matches description<textarea rows={2} value={settingsDraft.no_matches_description} onChange={(e) => updateSetting('no_matches_description', e.target.value)} /></label>
              <div className="settings-divider" />
              <div className="card-title"><h2>Story & footer</h2></div>
              <label>Story section label<input value={settingsDraft.story_eyebrow} onChange={(e) => updateSetting('story_eyebrow', e.target.value)} /></label>
              <div className="form-row">
                <label>Story heading, first line<input value={settingsDraft.story_title} onChange={(e) => updateSetting('story_title', e.target.value)} /></label>
                <label>Story heading, second line<input value={settingsDraft.story_title_emphasis} onChange={(e) => updateSetting('story_title_emphasis', e.target.value)} /></label>
              </div>
              <label>Story description<textarea rows={3} value={settingsDraft.about_text} onChange={(e) => updateSetting('about_text', e.target.value)} /></label>
              <label>Story link label<input value={settingsDraft.story_action_label} onChange={(e) => updateSetting('story_action_label', e.target.value)} /></label>
              <label>Story seal text <span className="label-hint">line breaks are preserved</span><textarea rows={3} value={settingsDraft.story_seal} onChange={(e) => updateSetting('story_seal', e.target.value)} /></label>
              <label>Footer tagline<input value={settingsDraft.footer_tagline} onChange={(e) => updateSetting('footer_tagline', e.target.value)} /></label>
              <label>Footer collection link<input value={settingsDraft.footer_collection_label} onChange={(e) => updateSetting('footer_collection_label', e.target.value)} /></label>
              <label>Copyright text<input value={settingsDraft.footer_copyright} onChange={(e) => updateSetting('footer_copyright', e.target.value)} /></label>
              <button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Save size={15} />}Save storefront settings</button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
