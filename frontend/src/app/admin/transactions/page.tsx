"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { logoutJwt, getCurrentUser, clearCache } from "@/lib/auth";
import { getAdminTransactions } from "@/lib/api";
import type { User, AdminTransactionItem } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Sukses" },
  { value: "failed", label: "Gagal" },
  { value: "expired", label: "Expired" },
  { value: "refunded", label: "Refund" },
];

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Data state
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminTransactions(
        page,
        perPage,
        statusFilter || undefined,
        searchQuery || undefined
      );
      setTransactions(data.transactions);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.replace("/login");
          return;
        }
        if (currentUser.role !== "admin") {
          router.replace("/");
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
    if (!checking && user) {
      fetchTransactions();
    }
  }, [checking, user, fetchTransactions]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutJwt();
    } catch {
      clearCache();
    }
    router.replace("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleStatusChange = (newStatus: string) => {
    setPage(1);
    setStatusFilter(newStatus);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      success: "bg-green-500/10 text-green-400",
      pending: "bg-yellow-500/10 text-yellow-400",
      failed: "bg-red-500/10 text-red-400",
      expired: "bg-gray-500/10 text-gray-400",
      refunded: "bg-blue-500/10 text-blue-400",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status] || "bg-gray-500/10 text-gray-400"
        }`}
      >
        {status}
      </span>
    );
  };

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
      {/* Admin Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
            >
              Concertix
            </Link>
            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 text-xs font-medium rounded-full border border-purple-500/30">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a
              href="/admin"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/admin/concerts"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Konser
            </a>
            <a href="/admin/transactions" className="text-white font-medium">
              Transaksi
            </a>
            <a
              href="/admin/users"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Pengguna
            </a>
          </nav>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">
                  {user.full_name}
                </p>
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Transaksi</h1>
            <p className="text-gray-400 mt-1">
              {total} transaksi ditemukan
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama atau email pembeli..."
                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Cari
              </button>
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400">Memuat transaksi...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-4xl mb-4">📋</p>
              <p>Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left p-4 font-medium">Pembeli</th>
                    <th className="text-left p-4 font-medium">Konser</th>
                    <th className="text-right p-4 font-medium">Jumlah</th>
                    <th className="text-center p-4 font-medium">Status Bayar</th>
                    <th className="text-center p-4 font-medium">Status Tiket</th>
                    <th className="text-left p-4 font-medium">Metode</th>
                    <th className="text-right p-4 font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-medium text-white">
                          {tx.buyer_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {tx.buyer_email}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-300">{tx.concert_name}</p>
                        <p className="text-xs text-gray-500">
                          {tx.concert_artist}
                        </p>
                      </td>
                      <td className="p-4 text-right text-gray-300">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-4 text-center">
                        {statusBadge(tx.status)}
                      </td>
                      <td className="p-4 text-center">
                        {tx.ticket_status && statusBadge(tx.ticket_status)}
                      </td>
                      <td className="p-4 text-gray-400 text-xs">
                        {tx.payment_type || "-"}
                      </td>
                      <td className="p-4 text-right text-gray-400 text-xs">
                        {formatDate(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-800">
              <p className="text-sm text-gray-400">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
