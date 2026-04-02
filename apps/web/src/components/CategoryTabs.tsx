import { useRef, useEffect } from 'react'
import type { Category } from '../types/menu'

const CATEGORY_EMOJI: Record<string, string> = {
  seafood:     '🦐',
  dishes:      '🥗',
  meze:        '🫙',
  sides:       '🍞',
  desserts:    '🍮',
  beer:        '🍺',
  wine:        '🍷',
  spirits:     '🥃',
  'soft-drinks': '☕',
}

interface Props {
  categories: Category[]
  activeId: string
  lang: 'bg' | 'en'
  onSelect: (id: string) => void
}

export default function CategoryTabs({ categories, activeId, lang, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [activeId])

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x px-4">
      {categories.map((cat) => {
        const isActive = activeId === cat.id
        const emoji = CATEGORY_EMOJI[cat.id] ?? '🍽️'
        return (
          <button
            key={cat.id}
            ref={isActive ? activeRef : null}
            onClick={() => onSelect(cat.id)}
            className={`snap-start flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 flex-shrink-0 ${
              isActive
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-md shadow-emerald-900/20'
                : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-400 hover:text-emerald-800'
            }`}
          >
            <span className="text-base leading-none">{emoji}</span>
            {lang === 'bg' ? cat.nameBg : cat.nameEn}
          </button>
        )
      })}
    </div>
  )
}
