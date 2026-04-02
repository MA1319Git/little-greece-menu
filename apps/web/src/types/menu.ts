export type DietaryLabel =
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'contains_nuts'
  | 'contains_dairy'
  | 'contains_eggs'
  | 'contains_fish'
  | 'spicy'

export interface MenuItem {
  id: string
  nameBg: string
  nameEn: string
  descriptionBg?: string
  descriptionEn?: string
  price: number // in stotinki, 0 = placeholder
  isAvailable: boolean
  dietaryLabels: DietaryLabel[]
}

export interface Category {
  id: string
  nameBg: string
  nameEn: string
  displayOrder: number
  items: MenuItem[]
}

export interface MenuData {
  categories: Category[]
}
