import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ImagePlus, LoaderCircle, PackagePlus, Save, Settings2, Trash2 } from 'lucide-react'
import { uploadAsset } from '../lib/catalog'
import ProductEditor from './ProductEditor'
import ProductTypesPanel from './ProductTypesPanel'
import type { Product, ProductType, StoreSettings } from '../types'

type AdminPanelProps = {
  products: Product[]
  productTypes: ProductType[]
  settings: StoreSettings
  onBack: () => void
  onSaveSettings: (settings: StoreSettings) => Promise<void>
  onSaveProduct: (product: Product) => Promise<void>
  onDeleteProduct: (productId: string) => Promise<void>
  onSaveProductType: (productType: ProductType) => Promise<void>
  onDeleteProductType: (typeId: string) => Promise<void>
}

export default function AdminPanel({ products, productTypes, settings, onBack, onSaveSettings, onSaveProduct, onDeleteProduct, onSaveProductType, onDeleteProductType }: AdminPanelProps) {
  const [section, setSection] = useState<'products' | 'product-types' | 'brand'>('products')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [settingsDraft, setSettingsDraft] = useState(settings)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => setSettingsDraft(settings), [settings])

  function startEdit(product: Product) {
    setEditingProduct(product)
    setSection('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function uploadImage(file: File, settingsField: 'logo_url' | 'favicon_url' | 'hero_image_url') {
    setBusy(true)
    setError('')
    try {
      const url = await uploadAsset(file, 'brand')
      setSettingsDraft((current) => ({ ...current, [settingsField]: url }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Asset upload failed.')
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
      if (editingProduct?.id === product.id) setEditingProduct(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove product.')
    }
  }

  const updateSetting = <K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) => setSettingsDraft((current) => ({ ...current, [field]: value }))

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> View storefront</button>
        <div className="admin-brand"><span className="brand-mark">t.</span><div><strong>trythrifty</strong><small>STORE MANAGEMENT</small></div></div>
        <nav aria-label="Admin sections">
          <button className={section === 'products' ? 'active' : ''} onClick={() => setSection('products')}><PackagePlus size={17} /> Products <span>{products.length}</span></button>
          <button className={section === 'product-types' ? 'active' : ''} onClick={() => setSection('product-types')}><Settings2 size={17} /> Product Types <span>{productTypes.length}</span></button>
          <button className={section === 'brand' ? 'active' : ''} onClick={() => setSection('brand')}><Settings2 size={17} /> Brand & storefront</button>
        </nav>
        <div className="admin-sidebar-note"><span className="status-dot" /> Changes publish to your storefront when saved.</div>
      </aside>
      <section className="admin-content">
        <header className="admin-topbar"><span className="eyebrow">ADMINISTRATOR</span><span className="admin-live"><span className="status-dot" /> Store management</span></header>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {success && <div className="admin-alert success" role="status">{success}</div>}

        {section === 'product-types' ? (
          <ProductTypesPanel
            productTypes={productTypes}
            productCounts={products.reduce<Record<string, number>>((counts, product) => {
              if (product.type_id) counts[product.type_id] = (counts[product.type_id] ?? 0) + 1
              return counts
            }, {})}
            onSave={onSaveProductType}
            onDelete={onDeleteProductType}
          />
        ) : section === 'products' ? (
          <>
            <div className="admin-title-row"><div><span className="eyebrow">YOUR SHOP</span><h1>Products</h1><p className="muted">Add a product or edit something already listed.</p></div><span className="count-pill">{products.length} products</span></div>
            <div className="admin-grid">
              <ProductEditor
                key={editingProduct?.id ?? 'new-product'}
                productTypes={productTypes}
                product={editingProduct ?? undefined}
                onSave={onSaveProduct}
                onCancel={() => setEditingProduct(null)}
                onCreateType={() => setSection('product-types')}
                onSaved={setSuccess}
              />

              <div className="admin-card inventory-card">
                <div className="card-title"><h2>Your products</h2><span>{products.length} items</span></div>
                {products.length === 0 ? <div className="admin-empty"><PackagePlus size={26} /><strong>No products yet</strong><p>Add your first piece using the form.</p></div> : (
                  <div className="inventory-list">{products.map((product) => (
                    <article className="inventory-item" key={product.id}>
                      {product.image_url && <img src={product.image_url} alt="" />}
                      <div className="inventory-detail"><strong>{product.name}</strong><span>{product.category} · ₹{product.price.toLocaleString('en-IN')}</span></div>
                      <button className="icon-button" title={`Edit ${product.name}`} onClick={() => startEdit(product)}>Edit</button>
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
              <div className="form-row">
                <label>Accent colour<input type="color" value={settingsDraft.accent_color} onChange={(e) => updateSetting('accent_color', e.target.value)} /></label>
                <label>Page background<input type="color" value={settingsDraft.background_color} onChange={(e) => updateSetting('background_color', e.target.value)} /></label>
              </div>
              <label>Logo image URL<input type="url" placeholder="https://…" value={settingsDraft.logo_url} onChange={(e) => updateSetting('logo_url', e.target.value)} /></label>
              <label className="upload-button"><ImagePlus size={15} /> Upload logo<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], 'logo_url')} /></label>
              {settingsDraft.logo_url && <img className="brand-image-preview" src={settingsDraft.logo_url} alt="Logo preview" />}
              <label>Favicon URL<input type="url" placeholder="https://…" value={settingsDraft.favicon_url} onChange={(e) => updateSetting('favicon_url', e.target.value)} /></label>
              <label className="upload-button"><ImagePlus size={15} /> Upload favicon<input type="file" accept="image/*,.ico" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], 'favicon_url')} /></label>
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
              <label className="upload-button"><ImagePlus size={15} /> Upload hero image<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void uploadImage(e.target.files[0], 'hero_image_url')} /></label>
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
