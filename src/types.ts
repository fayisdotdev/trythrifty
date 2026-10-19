export type ProductColor = {
  name: string
  hex: string
}

export type ProductFieldType = 'text' | 'number' | 'boolean' | 'select' | 'color'

export type ProductFieldDefinition = {
  key: string
  label: string
  type: ProductFieldType
  required: boolean
  options?: string[]
  unit?: string
  hidden?: boolean
}

export type ProductType = {
  id: string
  name: string
  fields: ProductFieldDefinition[]
  created_at?: string
}

export type ProductVariant = {
  id?: string
  product_id?: string
  color_name: string
  color_hex: string
  stock: number
  images: string[]
}

export type Product = {
  id: string
  name: string
  description: string
  price: number
  category: string
  type_id?: string | null
  attributes?: Record<string, unknown>
  brand?: string | null
  condition?: string | null
  image_url: string
  common_images?: string[]
  sizes: string[]
  colors: ProductColor[]
  variants?: ProductVariant[]
  active: boolean
  created_at?: string
}

export type StoreSettings = {
  id: number
  store_name: string
  logo_url: string
  favicon_url: string
  accent_color: string
  background_color: string
  whatsapp_number: string
  nav_home_label: string
  nav_collection_label: string
  nav_story_label: string
  search_placeholder: string
  hero_eyebrow: string
  hero_title: string
  hero_description: string
  hero_cta_label: string
  hero_feature_one: string
  hero_feature_two: string
  hero_image_url: string
  hero_art_eyebrow: string
  hero_art_title: string
  hero_art_subtitle: string
  hero_art_stamp: string
  hero_art_footer: string
  hero_index_label: string
  collection_eyebrow: string
  collection_title: string
  collection_title_emphasis: string
  collection_description: string
  collection_item_label: string
  collection_items_label: string
  collection_all_label: string
  empty_collection_eyebrow: string
  empty_collection_title: string
  empty_collection_description: string
  no_matches_eyebrow: string
  no_matches_title: string
  no_matches_description: string
  story_eyebrow: string
  story_title: string
  story_title_emphasis: string
  about_text: string
  story_action_label: string
  story_seal: string
  footer_tagline: string
  footer_collection_label: string
  footer_copyright: string
}

export type CartItem = {
  product: Product
  quantity: number
  size: string
  color: string
}
