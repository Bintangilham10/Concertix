export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Concertix
          </span>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 py-32 text-center relative">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Beli Tiket Konser
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Lebih Mudah
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Platform pembelian tiket konser online dengan pembayaran aman,
            tiket digital QR code, dan pengalaman yang seamless.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/concerts"
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Jelajahi Konser
            </a>
            <a
              href="/register"
              className="px-8 py-3 border border-gray-600 hover:border-gray-400 rounded-lg font-semibold transition-colors"
            >
              Daftar Gratis
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">
          Mengapa Concertix?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: "🔒",
              title: "Pembayaran Aman",
              desc: "Terintegrasi dengan Midtrans untuk pembayaran yang aman dan terpercaya.",
            },
            {
              icon: "📱",
              title: "Tiket Digital QR",
              desc: "Tiket langsung diterbitkan dalam bentuk QR code digital tanpa perlu cetak.",
            },
            {
              icon: "⚡",
              title: "Proses Cepat",
              desc: "Pesan dan bayar tiket konser dalam hitungan menit, kapan saja.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-gray-900 border border-gray-800 rounded-xl p-8 hover:border-purple-500/50 transition-colors"
            >
              <span className="text-4xl mb-4 block">{feature.icon}</span>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>&copy; 2026 Concertix — S1 Teknik Komputer, Telkom University</p>
        </div>
      </footer>
    </div>
  );
}
