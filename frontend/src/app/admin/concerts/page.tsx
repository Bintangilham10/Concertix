"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { logoutJwt, getCurrentUser, clearCache } from "@/lib/auth";
import { getConcerts } from "@/lib/api";
import type { User, Concert } from "@/types";

export default function AdminConcertsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchConcerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // getConcerts dari API biasanya mengembalikan PaginatedResponse
      // (Berdasarkan jenis return getConcerts di lib/api.ts)
      const data = await getConcerts(page, perPage) as import("@/types").PaginatedResponse<Concert>;
      // Asumsi kembalian dari endpoint sama dengan PaginatedResponse<Concert>
      setConcerts(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data konser.");
    } finally {
      setLoading(false);
    }
  }, [page, perPage]);

  // Kalau seandainya getConcerts mengembalikan data array polos (tergantung backend),
  // kita tambahkan fallback di sini. Pada saat useEffect berjalan kita sesuaikan mappingnya.
  
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== "admin") {
          router.replace(currentUser ? "/" : "/login");
          return;
        }
        setUser(currentUser);
        setChecking(false);
      } catch {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!checking && user) fetchConcerts();
  }, [checking, user, fetchConcerts]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logoutJwt(); } catch { clearCache(); }
    router.replace("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
    // API getConcerts saat ini di api.ts bawaan belum menerima query 'search', 
    // namun kita simpan state-nya untuk integrasi kedepannya jika API diupdate.
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  // Filter lokal sementara (karena API getConcerts belum support parameter search di backend)
  const filteredConcerts = concerts?.filter((c) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header (Matching existing Admin theme) */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Concertix
            </Link>
            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 text-xs font-medium rounded-full border border-purple-500/30">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="/admin" className="text-gray-400 hover:text-white transition-colors">Dashboard</a>
            <a href="/admin/concerts" className="text-white font-medium">Konser</a>
            <a href="/admin/transactions" className="text-gray-400 hover:text-white transition-colors">Transaksi</a>
            <a href="/admin/users" className="text-gray-400 hover:text-white transition-colors">Pengguna</a>
          </nav>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user.full_name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {loggingOut ? "Keluar..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Title and Add Button */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 px-2">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
              Manajemen Konser
            </h1>
            <p className="text-gray-400 mt-1">Total ada {total || filteredConcerts.length} konser terdaftar yang siap dijual</p>
          </div>
          <button className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2">
            <span role="img" aria-label="plus">➕</span> Tambah Konser Baru
          </button>
        </div>

        {/* Search Bar / Filter */}
        <div className="flex mb-8">
          <form onSubmit={handleSearch} className="w-full max-w-lg relative group">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama konser atau artis..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 pl-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors">
              🔍
            </span>
            <button type="submit" className="hidden">Submit</button>
          </form>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
             <span>⚠️</span> {error}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400 font-medium tracking-wide">Memuat katalog konser...</p>
            </div>
          ) : filteredConcerts.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <div className="text-6xl mb-4 opacity-50">🎸</div>
              <p className="text-lg font-medium text-gray-400">Katalog masih kosong</p>
              <p className="text-sm mt-1">Gunakan tombol 'Tambah Konser Baru' untuk memulai.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900/50 text-gray-400 shadow-sm border-b border-gray-800">
                    <th className="text-left p-5 font-semibold">Detail Konser</th>
                    <th className="text-left p-5 font-semibold">TGL & Waktu</th>
                    <th className="text-left p-5 font-semibold">Harga Reguler</th>
                    <th className="text-center p-5 font-semibold">Kapasitas (Terjual/Kuota)</th>
                    <th className="text-right p-5 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {filteredConcerts.map((c) => {
                    const sold = c.quota - c.available_tickets;
                    const percentSold = c.quota > 0 ? (sold / c.quota) * 100 : 0;
                    
                    return (
                      <tr key={c.id} className="hover:bg-gray-800/40 transition-colors group">
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700 overflow-hidden">
                              {c.image_url ? (
                                <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl">🎵</span>
                              )}
                            </div>
                            <div>
                               <p className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">
                                 {c.name}
                               </p>
                               <p className="text-gray-400 text-xs mt-0.5">🎤 {c.artist}</p>
                               <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                                 <span>📍</span> {c.venue}
                               </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-gray-300 whitespace-nowrap">
                          <div className="font-medium">{formatDate(c.date)}</div>
                          <div className="text-gray-500 text-xs mt-1">Jam: {c.time || "TBA"}</div>
                        </td>
                        <td className="p-5 font-semibold text-purple-400">
                           {formatCurrency(c.price)}
                        </td>
                        <td className="p-5">
                           <div className="flex flex-col items-center gap-2">
                             <div className="text-xs font-medium bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                               <span className="text-white">{sold}</span> / <span className="text-gray-400">{c.quota}</span>
                             </div>
                             <div className="w-full max-w-[120px] bg-gray-800 rounded-full h-1.5 overflow-hidden">
                               <div 
                                 className={`h-full rounded-full ${percentSold > 80 ? 'bg-green-500' : 'bg-purple-500'}`} 
                                 style={{ width: `${percentSold}%` }}
                               />
                             </div>
                           </div>
                        </td>
                        <td className="p-5 text-right whitespace-nowrap">
                          <button className="p-2 text-gray-400 hover:text-blue-400 bg-gray-800/50 hover:bg-blue-500/10 rounded-lg transition-colors mr-2 border border-transparent hover:border-blue-500/20" title="Edit Konser">
                             ✏️
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-400 bg-gray-800/50 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20" title="Hapus Konser">
                             🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-5 border-t border-gray-800 bg-gray-900/80">
              <p className="text-sm text-gray-400 font-medium">Halaman <span className="text-white">{page}</span> dari {totalPages}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage((p) => Math.max(1, p - 1))} 
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-gray-700 font-medium"
                >
                  ← Sebelumnya
                </button>
                <button 
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-gray-700 font-medium"
                >
                  Selanjutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
