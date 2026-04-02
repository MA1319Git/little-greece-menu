interface Props {
  url: string
}

export default function QRPage({ url }: Props) {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=0d3d6e&bgcolor=ffffff&data=${encodeURIComponent(url)}`

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 print:p-4"
      style={{ background: 'linear-gradient(160deg, #0d3d6e 0%, #1a6b9a 60%, #2a8fc4 100%)' }}>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-medium tracking-widest uppercase text-blue-400 mb-1">Добре дошли · Welcome</p>
          <h1 className="text-2xl font-bold text-[#0d3d6e]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Малката Гърция
          </h1>
          <p className="text-stone-400 text-sm mt-0.5">The Little Greece</p>
          <p className="text-stone-400 text-xs mt-1">Гръцка кухня · Greek cuisine</p>
        </div>

        {/* QR code */}
        <div className="rounded-2xl p-3 border-2 border-blue-100">
          <img
            src={qrApiUrl}
            alt="QR code to menu"
            width={220}
            height={220}
            className="block"
          />
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-[#0d3d6e] font-semibold text-base">Сканирай за менюто</p>
          <p className="text-stone-400 text-sm">Scan to view the menu</p>
        </div>

        {/* Divider + URL */}
        <div className="w-full border-t border-stone-100 pt-4 text-center">
          <p className="text-stone-300 text-xs break-all">{url}</p>
        </div>
      </div>

      {/* Print button */}
      <button
        onClick={() => window.print()}
        className="print:hidden bg-white text-[#0d3d6e] px-8 py-3 rounded-full text-sm font-semibold shadow-lg hover:bg-blue-50 transition-colors"
      >
        Print QR code
      </button>
    </div>
  )
}
