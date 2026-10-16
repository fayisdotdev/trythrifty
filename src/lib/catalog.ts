import type { Product, StoreSettings } from '../types'
import { supabase } from './supabase'

export async function loadStorefront(): Promise<{ products: Product[]; settings: StoreSettings }> {
  if (!supabase) throw new Error('Connect Supabase before loading storefront content.')

  const [productsResult, settingsResult] = await Promise.all([
    supabase
      .from('trythrifty_products')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase.from('trythrifty_store_settings').select('*').eq('id', 1).maybeSingle(),
  ])

  if (productsResult.error) throw productsResult.error
  if (settingsResult.error) throw settingsResult.error

  if (!settingsResult.data) throw new Error('Storefront settings have not been configured in Supabase.')

  return {
    products: (productsResult.data ?? []) as Product[],
    settings: settingsResult.data as StoreSettings,
  }
}

export async function uploadAsset(file: File, folder: 'products' | 'brand'): Promise<string> {
  if (!supabase) throw new Error('Connect Supabase before uploading assets.')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from('trythrifty-assets').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('trythrifty-assets').getPublicUrl(path)
  return data.publicUrl
}
