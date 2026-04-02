interface Props {
  lang: 'bg' | 'en'
  onChange: (lang: 'bg' | 'en') => void
}

export default function LanguageToggle({ lang, onChange }: Props) {
  return (
    <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-full p-0.5 border border-white/20">
      <button
        onClick={() => onChange('bg')}
        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
          lang === 'bg'
            ? 'bg-white text-emerald-900 shadow-sm'
            : 'text-white/80 hover:text-white'
        }`}
      >
        БГ
      </button>
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
          lang === 'en'
            ? 'bg-white text-emerald-900 shadow-sm'
            : 'text-white/80 hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  )
}
