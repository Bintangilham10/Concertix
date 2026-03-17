export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Admin Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Concertix
            </a>
            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 text-xs font-medium rounded-full border border-purple-500/30">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="/admin" className="text-white font-medium">Dashboard</a>
            <a href="/admin/concerts" className="text-gray-400 hover:text-white transition-colors">Konser</a>
            <a href="/admin/transactions" className="text-gray-400 hover:text-white transition-colors">Transaksi</a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Dashboard Admin</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Konser", value: "0", icon: "🎵" },
            { label: "Tiket Terjual", value: "0", icon: "🎫" },
            { label: "Pendapatan", value: "Rp 0", icon: "💰" },
            { label: "Pengguna", value: "0", icon: "👥" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Placeholder Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Transaksi Terbaru</h2>
          </div>
          <div className="p-12 text-center text-gray-500">
            <p className="text-4xl mb-4">📋</p>
            <p>Belum ada transaksi</p>
          </div>
        </div>
      </main>
    </div>
  );
}
