import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowRight, Check, Heart, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import AdminPanel from './components/AdminPanel'
import AuthModal from './components/AuthModal'
import CartDrawer from './components/CartDrawer'
import ProductCard from './components/ProductCard'
import { loadStorefront } from './lib/catalog'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { fieldsForProductType } from './config/productSchemas'
import type { CartItem, Product, ProductFieldDefinition, ProductType, StoreSettings } from './types'

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [isAdminPage, setIsAdminPage] = useState(window.location.hash === '#admin')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [category, setCategory] = useState('all')
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')

  async function refreshStorefront() {
    const result = await loadStorefront()
    setProducts(result.products)
    setProductTypes(result.productTypes)
    setSettings(result.settings)
  }

  useEffect(() => {
    let alive = true
    void loadStorefront().then((result) => {
      if (!alive) return
      setProducts(result.products)
      setProductTypes(result.productTypes)
      setSettings(result.settings)
    }).catch((error: unknown) => {
      if (alive) setLoadError(error instanceof Error ? error.message : 'Could not load the storefront.')
    }).finally(() => {
      if (alive) setLoading(false)
    })

    function handleHashChange() {
      setIsAdminPage(window.location.hash === '#admin')
    }
    window.addEventListener('hashchange', handleHashChange)

    const client = supabase
    if (!client) return () => {
      alive = false
      window.removeEventListener('hashchange', handleHashChange)
    }

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      setUserEmail(user?.email ?? null)
      if (!user) {
        setIsAdmin(false)
        return
      }
      void client.from('trythrifty_profiles').select('role').eq('id', user.id).maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            setLoadError(`Could not check account permissions: ${error.message}`)
            setIsAdmin(false)
          } else {
            setIsAdmin(data?.role === 'admin')
          }
        })
    })
    return () => {
      alive = false
      window.removeEventListener('hashchange', handleHashChange)
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!settings) return
    document.documentElement.style.setProperty('--accent', settings.accent_color)
    document.documentElement.style.setProperty('--page', settings.background_color)
    document.title = settings.store_name
    if (settings.favicon_url) {
      let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!icon) {
        icon = document.createElement('link')
        icon.rel = 'icon'
        document.head.appendChild(icon)
      }
      icon.href = settings.favicon_url
    }
  }, [settings])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const publishedProducts = useMemo(() => products.filter((product) => product.active), [products])
  const categories = useMemo(() => [...new Set(publishedProducts.map((product) => product.category).filter(Boolean))], [publishedProducts])
  const productFilters = useMemo(() => productTypes.flatMap((productType) =>
    fieldsForProductType(productType.name, productType.fields)
      .filter((field) => !field.hidden && (field.type === 'select' || field.type === 'boolean'))
      .filter((field) => publishedProducts.some((product) => product.type_id === productType.id && product.attributes?.[field.key] !== undefined))
      .map((field: ProductFieldDefinition) => ({
        id: `${productType.id}:${field.key}`,
        typeId: productType.id,
        field,
        options: field.type === 'boolean' ? ['true', 'false'] : (field.options ?? []),
      })),
  ), [productTypes, publishedProducts])
  const visibleProducts = useMemo(() => publishedProducts.filter((product) => {
    const categoryMatches = category === 'all' || product.category === category
    const searchMatches = `${product.name} ${product.description} ${product.category} ${Object.values(product.attributes ?? {}).join(' ')}`.toLowerCase().includes(search.toLowerCase())
    const attributesMatch = productFilters.every(({ id, typeId, field }) => {
      const selected = attributeFilters[id]
      if (!selected || product.type_id !== typeId) return true
      return String(product.attributes?.[field.key]) === selected
    })
    return product.active && categoryMatches && searchMatches && attributesMatch
  }), [publishedProducts, category, search, productFilters, attributeFilters])
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const formatPrice = (value: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(value)

  if (!isSupabaseConfigured) return (
    <div className="admin-gate">
      <section className="panel gate-card"><span className="eyebrow">STOREFRONT NOT CONNECTED</span><h1>Connect Supabase to load your store.</h1><p>Add Supabase credentials to <code>.env.local</code> and apply the SQL modules in the project’s <code>sql</code> folder. Storefront content is not shown from local defaults.</p></section>
    </div>
  )

  if (loading || !settings) return (
    <div className="admin-gate">
      <section className="panel gate-card"><span className="eyebrow">{loading ? 'LOADING STOREFRONT' : 'STOREFRONT UNAVAILABLE'}</span><h1>{loading ? 'Loading your store…' : 'Could not load your store.'}</h1><p className="muted">{loading ? 'Store content is being loaded from Supabase.' : loadError || 'No storefront settings were returned from Supabase.'}</p>{!loading && <button className="button button-primary" onClick={() => window.location.reload()}>Try again</button>}</section>
    </div>
  )

  function addToBag(product: Product, size: string, color: string) {
    setCart((current) => {
      const found = current.findIndex((item) => item.product.id === product.id && item.size === size && item.color === color)
      if (found === -1) return [...current, { product, quantity: 1, size, color }]
      return current.map((item, index) => index === found ? { ...item, quantity: item.quantity + 1 } : item)
    })
    setToast(`${product.name} added to your bag`)
  }

  function changeQuantity(index: number, amount: number) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, quantity: item.quantity + amount }
      : item).filter((item) => item.quantity > 0))
  }

  async function authComplete() {
    setAuthOpen(false)
    if (!supabase) return
    const { data } = await supabase.auth.getUser()
    setUserEmail(data.user?.email ?? null)
    if (data.user) {
      const { data: profile, error } = await supabase.from('trythrifty_profiles').select('role').eq('id', data.user.id).maybeSingle()
      if (error) setLoadError(`Could not check account permissions: ${error.message}`)
      setIsAdmin(profile?.role === 'admin')
    }
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setLoadError(`Sign out failed: ${error.message}`)
    else {
      setUserEmail(null)
      setIsAdmin(false)
      setIsAdminPage(false)
      window.location.hash = ''
    }
  }

  async function saveProduct(product: Product) {
    if (!supabase) throw new Error('Connect Supabase before managing products.')
    const { variants = [], ...productRow } = product
    const { error: productError } = await supabase.from('trythrifty_products').upsert(productRow)
    if (productError) throw productError

    const variantsToSave = variants.map((variant) => ({
      ...variant,
      id: variant.id ?? crypto.randomUUID(),
      product_id: product.id,
    }))
    if (variantsToSave.length) {
      const { error: variantsError } = await supabase.from('trythrifty_product_variants').upsert(variantsToSave)
      if (variantsError) throw variantsError
    }
    const existingResult = await supabase.from('trythrifty_product_variants').select('id').eq('product_id', product.id)
    if (existingResult.error) throw existingResult.error
    const retainedIds = new Set(variantsToSave.map(({ id }) => id))
    for (const existing of existingResult.data ?? []) {
      if (retainedIds.has(existing.id)) continue
      const { error: deleteError } = await supabase.from('trythrifty_product_variants').delete().eq('id', existing.id)
      if (deleteError) throw deleteError
    }
    await refreshStorefront()
  }

  async function deleteProduct(productId: string) {
    if (!supabase) throw new Error('Connect Supabase before managing products.')
    const { error } = await supabase.from('trythrifty_products').delete().eq('id', productId)
    if (error) throw error
    await refreshStorefront()
  }

  async function saveSettings(nextSettings: StoreSettings) {
    if (!supabase) throw new Error('Connect Supabase before managing storefront settings.')
    const { error } = await supabase.from('trythrifty_store_settings').upsert(nextSettings)
    if (error) throw error
    await refreshStorefront()
  }

  async function saveProductType(productType: ProductType) {
    if (!supabase) throw new Error('Connect Supabase before managing product types.')
    const { error } = await supabase.from('trythrifty_product_types').upsert(productType)
    if (error) throw error
    await refreshStorefront()
  }

  async function deleteProductType(typeId: string) {
    if (!supabase) throw new Error('Connect Supabase before managing product types.')
    const { error } = await supabase.from('trythrifty_product_types').delete().eq('id', typeId)
    if (error) throw error
    await refreshStorefront()
  }

  if (isAdminPage) {
    if (!isSupabaseConfigured) return (
      <div className="admin-gate">
        <section className="panel gate-card"><span className="eyebrow">STORE ADMIN</span><h1>Connect your store first.</h1><p>Add Supabase credentials to <code>.env.local</code>, then apply the SQL modules in the project’s <code>sql</code> folder.</p><a className="button button-primary" href="#">Back to storefront</a></section>
      </div>
    )
    if (!userEmail) return (
      <div className="admin-gate">
        <section className="panel gate-card"><span className="eyebrow">PRIVATE STORE AREA</span><h1>Admin sign in</h1><p className="muted">Sign in with an account that has been promoted to admin.</p><button className="button button-primary" onClick={() => setAuthOpen(true)}>Sign in to continue <ArrowRight size={15} /></button><a className="back-link gate-back" href="#">Return to shop</a></section>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onComplete={() => void authComplete()} />}
      </div>
    )
    if (!isAdmin) return (
      <div className="admin-gate">
        <section className="panel gate-card"><span className="eyebrow">ACCESS RESTRICTED</span><h1>This account is not an admin.</h1><p className="muted">Sign in is working, but this account has not been promoted in the profiles table.</p><button className="button button-quiet" onClick={() => void signOut()}>Sign out</button><a className="back-link gate-back" href="#">Return to shop</a></section>
      </div>
    )
    return <AdminPanel products={products} productTypes={productTypes} settings={settings} onBack={() => { window.location.hash = '' }} onSaveSettings={saveSettings} onSaveProduct={saveProduct} onDeleteProduct={deleteProduct} onSaveProductType={saveProductType} onDeleteProductType={deleteProductType} />
  }

  return (
    <div className="app-shell" style={{ '--accent': settings.accent_color, '--page': settings.background_color } as CSSProperties}>
      <header className="site-header">
        <nav className="nav-frame">
          <a className="brand" href="#top" aria-label={`${settings.store_name} home`}>
            {settings.logo_url ? <img src={settings.logo_url} alt={settings.store_name} /> : <><span className="brand-mark">{settings.store_name.charAt(0)}.</span><span>{settings.store_name}<b>.</b></span></>}
          </a>
          <div className="nav-links"><a href="#top">{settings.nav_home_label}</a><a href="#collection">{settings.nav_collection_label}</a><a href="#story">{settings.nav_story_label}</a></div>
          <div className="nav-actions">
            <button className="mobile-search-trigger" aria-label="Open product search" onClick={() => setMobileSearchOpen((open) => !open)}><Search size={17} /></button>
            <label className={`search-box ${mobileSearchOpen ? 'expanded' : ''}`}><Search size={16} /><input aria-label="Search products" placeholder={settings.search_placeholder} value={search} onChange={(e) => { setSearch(e.target.value); setCategory('all') }} />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button>}</label>
            {userEmail ? <button className="account-button" title={userEmail} onClick={() => void signOut()}><UserRound size={17} /><span>Sign out</span></button> : <button className="account-button" onClick={() => setAuthOpen(true)}><UserRound size={17} /><span>Account</span></button>}
            <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${count} items`}><ShoppingBag size={17} /><span>Bag</span><b>{count}</b></button>
            <button className="mobile-menu" onClick={() => document.getElementById('mobile-nav')?.classList.toggle('show')} aria-label="Toggle menu"><Menu size={20} /></button>
          </div>
        </nav>
        <div className="mobile-nav" id="mobile-nav"><a href="#top" onClick={() => document.getElementById('mobile-nav')?.classList.remove('show')}>{settings.nav_home_label}</a><a href="#collection" onClick={() => document.getElementById('mobile-nav')?.classList.remove('show')}>{settings.nav_collection_label}</a><a href="#story" onClick={() => document.getElementById('mobile-nav')?.classList.remove('show')}>{settings.nav_story_label}</a></div>
      </header>

      {loadError && <div className="error-banner" role="alert">{loadError}<button onClick={() => setLoadError('')} aria-label="Dismiss error"><X size={15} /></button></div>}

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><span className="tiny-dot" /> {settings.hero_eyebrow}</span>
            <h1>{settings.hero_title}</h1>
            <p>{settings.hero_description}</p>
            <a className="button button-primary hero-cta" href="#collection">{settings.hero_cta_label} <ArrowRight size={16} /></a>
            <div className="hero-footnote"><span><Check size={14} /> {settings.hero_feature_one}</span><span><Heart size={14} /> {settings.hero_feature_two}</span></div>
          </div>
          <div className="hero-art" aria-label="A second life for good clothes">
            {settings.hero_image_url ? <img className="hero-art-image" src={settings.hero_image_url} alt="" /> : <>
              <div className="art-sun" />
              <div className="art-type"><span>{settings.hero_art_eyebrow}</span><strong>{settings.hero_art_title}</strong><small>{settings.hero_art_subtitle}</small></div>
              <div className="art-stamp"><span>{settings.hero_art_stamp}</span><Heart size={17} /></div>
              <div className="art-bottom"><span>{settings.hero_art_footer}</span><ArrowDown size={17} /></div>
            </>}
          </div>
          <div className="hero-index">01 <span>—</span> {settings.hero_index_label}</div>
        </section>

        <section className="collection-section" id="collection">
          <div className="section-topline"><span className="eyebrow">{settings.collection_eyebrow}</span><span className="inventory-caption">{publishedProducts.length} {publishedProducts.length === 1 ? settings.collection_item_label : settings.collection_items_label} listed</span></div>
          <div className="collection-heading"><div><h2>{settings.collection_title}<br /><em>{settings.collection_title_emphasis}</em></h2><p>{settings.collection_description}</p></div>
            <div className="collection-filter">
              {['all', ...categories].map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item === 'all' ? settings.collection_all_label : item}</button>)}
              {productFilters.map(({ id, typeId, field, options }) => <label className="attribute-filter" key={id}>
                <span>{productTypes.find((type) => type.id === typeId)?.name}: {field.label}</span>
                <select value={attributeFilters[id] ?? ''} onChange={(event) => setAttributeFilters((current) => ({ ...current, [id]: event.target.value }))}>
                  <option value="">Any</option>
                  {options.map((option) => <option value={option} key={option}>{field.type === 'boolean' ? option === 'true' ? 'Yes' : 'No' : option}</option>)}
                </select>
              </label>)}
            </div>
          </div>
          {loading ? <div className="catalog-message">Loading the collection…</div> : visibleProducts.length === 0 ? (
            <div className="empty-collection">
              <div className="empty-symbol">{settings.store_name.charAt(0)}<span>.</span></div>
              <div><span className="eyebrow">{search ? settings.no_matches_eyebrow : settings.empty_collection_eyebrow}</span>
                <h3>{search ? settings.no_matches_title : settings.empty_collection_title}</h3>
                <p>{search ? settings.no_matches_description : settings.empty_collection_description}</p>
                {search && <button className="text-action" onClick={() => setSearch('')}>Clear search <span>↗</span></button>}
              </div>
            </div>
          ) : <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} productType={productTypes.find((type) => type.id === product.type_id)} formatPrice={formatPrice} onAdd={addToBag} />)}</div>}
        </section>

        <section className="story-section" id="story">
          <span className="eyebrow">{settings.story_eyebrow}</span><h2>{settings.story_title}<br /><em>{settings.story_title_emphasis}</em></h2>
          <p>{settings.about_text}</p><a className="text-action" href="#collection">{settings.story_action_label} <span>↗</span></a>
          <span className="story-seal">{settings.story_seal}</span>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top">{settings.logo_url ? <img src={settings.logo_url} alt={settings.store_name} /> : <><span className="brand-mark">{settings.store_name.charAt(0)}.</span><span>{settings.store_name}<b>.</b></span></>}</a>
        <p>{settings.footer_tagline}</p><a href="#collection">{settings.footer_collection_label} <ArrowRight size={14} /></a>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {settings.store_name}. {settings.footer_copyright}</span>{isAdmin ? <a href="#admin">Manage store <ArrowRight size={13} /></a> : userEmail ? <button onClick={() => void signOut()}>Sign out</button> : <button onClick={() => setAuthOpen(true)}>Your account</button>}</div>
      </footer>

      <CartDrawer open={cartOpen} items={cart} whatsappNumber={settings.whatsapp_number} onClose={() => setCartOpen(false)} onQuantity={changeQuantity} onRemove={(index) => setCart((current) => current.filter((_, i) => i !== index))} formatPrice={formatPrice} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onComplete={() => void authComplete()} />}
      {toast && <div className="toast" role="status"><Check size={15} />{toast}</div>}
    </div>
  )
}
