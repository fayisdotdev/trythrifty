export const CLOTHING_COMPATIBILITY: Record<string, string[]> = {
  sleeveless: ['t-shirt', 'jacket', 'dress', 'top', 'vest'],
  half: ['shirt', 't-shirt'],
  '3/4': ['shirt', 't-shirt'],
  full: ['shirt', 't-shirt', 'hoodie', 'sweatshirt', 'jacket'],
}

export const GARMENT_TYPES = [...new Set(Object.values(CLOTHING_COMPATIBILITY).flat())].sort()
export const SLEEVE_TYPES = Object.keys(CLOTHING_COMPATIBILITY)
