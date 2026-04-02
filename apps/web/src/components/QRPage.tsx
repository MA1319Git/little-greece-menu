interface Props {
  url: string
}

export default function QRPage({ url }: Props) {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8 p-8 print:p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-emerald-800">Парк Ресторант</h1>
        <p className="text-stone-500 mt-1">Park Restaurant</p>
      </div>

      <div className="border-4 border-emerald-700 rounded-2xl p-4 bg-white shadow-lg">
        <img
          src={qrApiUrl}
          alt="QR code to menu"
          width={300}
          height={300}
          className="block"
        />
      </div>

      <div className="text-center">
        <p className="text-stone-700 font-medium text-lg">Сканирай за менюто</p>
        <p className="text-stone-500 text-sm">Scan for the menu</p>
        <p className="text-stone-400 text-xs mt-2 break-all">{url}</p>
      </div>

      <button
        onClick={() => window.print()}
        className="print:hidden bg-emerald-700 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-emerald-800 transition-colors"
      >
        Print QR code
      </button>
    </div>
  )
}
