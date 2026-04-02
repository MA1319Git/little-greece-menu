import type { MenuItem, DietaryLabel } from '../types/menu'

const DIETARY_CONFIG: Record<DietaryLabel, { icon: string; labelBg: string; labelEn: string; color: string }> = {
  vegetarian:     { icon: '🌿', labelBg: 'Вегетарианско', labelEn: 'Vegetarian',      color: 'bg-green-50 text-green-700 ring-green-200' },
  vegan:          { icon: '🌱', labelBg: 'Веганско',       labelEn: 'Vegan',           color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  gluten_free:    { icon: '🌾', labelBg: 'Без глутен',     labelEn: 'Gluten-free',     color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  contains_nuts:  { icon: '🥜', labelBg: 'Ядки',           labelEn: 'Contains nuts',   color: 'bg-orange-50 text-orange-700 ring-orange-200' },
  contains_dairy: { icon: '🥛', labelBg: 'Млечни',         labelEn: 'Contains dairy',  color: 'bg-blue-50 text-blue-700 ring-blue-200' },
  contains_eggs:  { icon: '🥚', labelBg: 'Яйца',           labelEn: 'Contains eggs',   color: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  contains_fish:  { icon: '🐟', labelBg: 'Морски',         labelEn: 'Seafood',         color: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
  spicy:          { icon: '🌶️', labelBg: 'Лютиво',         labelEn: 'Spicy',           color: 'bg-red-50 text-red-700 ring-red-200' },
}

function formatPrice(price: number, lang: 'bg' | 'en'): string {
  if (price === 0) return lang === 'bg' ? 'питайте' : 'ask us'
  return `€${(price / 100).toFixed(2)}`
}

interface Props {
  item: MenuItem
  lang: 'bg' | 'en'
}

export default function MenuItemCard({ item, lang }: Props) {
  const name = lang === 'bg' ? item.nameBg : item.nameEn
  const description = lang === 'bg' ? item.descriptionBg : item.descriptionEn
  const isPriceSet = item.price > 0

  return (
    <div
      className={`relative bg-white rounded-2xl overflow-hidden transition-opacity ${
        !item.isAvailable ? 'opacity-50' : ''
      }`}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 rounded-l-2xl" />

      <div className="flex flex-col gap-2.5" style={{ paddingLeft: '2rem', paddingRight: '1.5rem', paddingTop: '1.25rem', paddingBottom: '1.25rem' }}>
        {/* Name + price row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-stone-900 leading-snug text-[15px] flex-1">
            {name}
          </h3>
          <span
            className={`text-sm font-semibold whitespace-nowrap mt-0.5 ${
              isPriceSet ? 'text-emerald-700' : 'text-stone-400 italic text-xs font-normal'
            }`}
          >
            {formatPrice(item.price, lang)}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-stone-500 text-sm leading-relaxed">{description}</p>
        )}

        {/* Dietary labels */}
        {item.dietaryLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {item.dietaryLabels.map((label) => {
              const d = DIETARY_CONFIG[label]
              return (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${d.color}`}
                >
                  {d.icon} {lang === 'bg' ? d.labelBg : d.labelEn}
                </span>
              )
            })}
          </div>
        )}

        {/* Unavailable badge */}
        {!item.isAvailable && (
          <span className="text-xs text-red-500 font-medium">
            {lang === 'bg' ? '✕ Временно недостъпно' : '✕ Currently unavailable'}
          </span>
        )}
      </div>
    </div>
  )
}
