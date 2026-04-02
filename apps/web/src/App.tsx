import { useState } from 'react'
import menuData from './data/menu.json'
import type { MenuData } from './types/menu'
import LanguageToggle from './components/LanguageToggle'
import CategoryTabs from './components/CategoryTabs'
import MenuItemCard from './components/MenuItemCard'

const menu = menuData as MenuData

const CATEGORY_EMOJI: Record<string, string> = {
  seafood: '🦐', dishes: '🥗', meze: '🫙', sides: '🍞',
  desserts: '🍮', beer: '🍺', wine: '🍷', spirits: '🥃', 'soft-drinks': '☕',
}

export default function App() {
  const [lang, setLang] = useState<'bg' | 'en'>('bg')
  const [activeCategory, setActiveCategory] = useState(menu.categories[0].id)

  function handleTabSelect(id: string) {
    setActiveCategory(id)
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const currentCategory = menu.categories.find((c) => c.id === activeCategory)!

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-[#e0eefc]">

      {/* ── Header ── */}
      <header
        className="relative overflow-hidden px-5 text-white"
        style={{ background: 'linear-gradient(160deg, #0d3d6e 0%, #1a6b9a 60%, #2a8fc4 100%)', paddingTop: '2.5rem', paddingBottom: '5rem' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a8d5e8, transparent)' }} />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a8d5e8, transparent)' }} />

        {/* Decorative food images — transparent bg, composed bottom-right */}
        <img src="/shrimps.png" alt="" aria-hidden="true"
          className="absolute bottom-6 right-0 w-44 h-36 select-none pointer-events-none object-contain"
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,60,0.4))' }} />
        <img src="/mussels.png" alt="" aria-hidden="true"
          className="absolute bottom-4 right-32 w-32 h-28 select-none pointer-events-none object-contain"
          style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,60,0.35))' }} />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-200/80 text-xs font-medium tracking-widest uppercase mb-1">
              {lang === 'bg' ? 'Добре дошли' : 'Welcome'}
            </p>
            <h1
              className="font-display text-3xl font-bold leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {lang === 'bg' ? 'Малката Гърция' : 'The Little Greece'}
            </h1>
            <p className="text-blue-100/70 text-sm mt-1.5 font-medium">
              {lang === 'bg' ? 'Гръцка кухня · Сезонно меню' : 'Greek cuisine · Seasonal menu'}
            </p>
          </div>
          <div className="mt-1 flex-shrink-0">
            <LanguageToggle lang={lang} onChange={setLang} />
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 400 18" preserveAspectRatio="none" className="w-full h-5 fill-[#e0eefc]">
            <path d="M0,18 C100,0 300,18 400,4 L400,18 Z" />
          </svg>
        </div>
      </header>

      {/* ── Sticky tabs ── */}
      <div className="sticky top-0 z-10 bg-[#e0eefc] py-3 border-b border-blue-200/60">
        <CategoryTabs
          categories={menu.categories}
          activeId={activeCategory}
          lang={lang}
          onSelect={handleTabSelect}
        />
      </div>

      {/* ── Menu items ── */}
      <main className="flex-1 px-4 pt-5 pb-8">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{CATEGORY_EMOJI[currentCategory.id] ?? '🍽️'}</span>
          <div>
            <h2 className="text-lg font-bold text-stone-800 leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {lang === 'bg' ? currentCategory.nameBg : currentCategory.nameEn}
            </h2>
            <p className="text-stone-400 text-xs">
              {currentCategory.items.length} {lang === 'bg' ? 'артикула' : 'items'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {currentCategory.items.map((item) => (
            <MenuItemCard key={item.id} item={item} lang={lang} />
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-6 px-4 border-t border-stone-200/60">
        <p className="text-stone-400 text-xs">
          {lang === 'bg'
            ? 'Всички цени са в лева (лв.) с включен ДДС'
            : 'All prices are in BGN (лв.) incl. VAT'}
        </p>
        <p className="text-stone-300 text-xs mt-1">
          {lang === 'bg' ? '· Сезонно меню ·' : '· Seasonal menu ·'}
        </p>
      </footer>
    </div>
  )
}
