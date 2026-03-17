export default function ConcertsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Concertix
          </a>
          <nav className="flex items-center gap-6">
            <a href="/concerts" className="text-gray-300 hover:text-white transition-colors">
              Konser
            </a>
            <a href="/login" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">
              Masuk
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Konser Mendatang</h1>
        <p className="text-gray-400 mb-10">
          Temukan dan pesan tiket konser favoritmu
        </p>

        {/* Concert Grid Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors group"
            >
              <div className="h-48 bg-gradient-to-br from-purple-900/40 to-pink-900/40 flex items-center justify-center">
                <span className="text-6xl">🎵</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold group-hover:text-purple-300 transition-colors">
                  Nama Konser {i}
                </h3>
                <p className="text-gray-400 text-sm mt-1">Artis Placeholder</p>
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                  <span>📅 1 Januari 2026</span>
                  <span>•</span>
                  <span>📍 Jakarta</span>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-purple-400 font-semibold">
                    Rp 500.000
                  </span>
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">
                    Pesan
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
