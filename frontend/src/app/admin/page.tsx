"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutJwt, getCurrentUser, clearCache } from "@/lib/auth";
import { getAdminStats } from "@/lib/api";
import type { User, AdminStats } from "@/types";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

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

        // Fetch dashboard stats
        try {
          const data = await getAdminStats();
          setStats(data);
        } catch (err) {
          setStatsError(
            err instanceof Error ? err.message : "Gagal memuat statistik"
          );
        }
      } catch {
        router.replace("/login");
      }
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutJwt();
    } catch {
      // Even if backend logout fails, clear local state
      clearCache();
    }
    router.replace("/login");
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

  // Show loading state while checking auth
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
            <a href="/admin" className="text-white font-medium">
              Dashboard
            </a>
            <a
              href="/admin/concerts"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Konser
            </a>
            <a
              href="/admin/transactions"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Transaksi
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
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            {user && (
              <p className="text-gray-400 mt-1">
                Selamat datang, {user.full_name} 👋
              </p>
            )}
          </div>
        </div>

        {/* Stats Error */}
        {statsError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
            ⚠️ {statsError}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            {
              label: "Total Konser",
              value: stats ? String(stats.total_concerts) : "—",
              icon: "🎵",
            },
            {
              label: "Tiket Terjual",
              value: stats ? String(stats.total_tickets_sold) : "—",
              icon: "🎫",
            },
            {
              label: "Pendapatan",
              value: stats ? formatCurrency(stats.total_revenue) : "—",
              icon: "💰",
            },
            {
              label: "Pengguna",
              value: stats ? String(stats.total_users) : "—",
              icon: "👥",
            },
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

        {/* Concert List */}
        {stats && stats.concerts.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl mb-8">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold">Daftar Konser</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left p-4 font-medium">Nama</th>
                    <th className="text-left p-4 font-medium">Artis</th>
                    <th className="text-left p-4 font-medium">Venue</th>
                    <th className="text-right p-4 font-medium">Harga</th>
                    <th className="text-right p-4 font-medium">Terjual</th>
                    <th className="text-right p-4 font-medium">Sisa</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.concerts.map((concert) => (
                    <tr
                      key={concert.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-4 font-medium text-white">
                        {concert.name}
                      </td>
                      <td className="p-4 text-gray-300">{concert.artist}</td>
                      <td className="p-4 text-gray-300">{concert.venue}</td>
                      <td className="p-4 text-right text-gray-300">
                        {formatCurrency(concert.price)}
                      </td>
                      <td className="p-4 text-right">
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
                          {concert.tickets_sold}
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-300">
                        {concert.available_tickets}/{concert.quota}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Transaksi Terbaru</h2>
          </div>
          {stats && stats.recent_transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left p-4 font-medium">Pembeli</th>
                    <th className="text-left p-4 font-medium">Konser</th>
                    <th className="text-right p-4 font-medium">Jumlah</th>
                    <th className="text-center p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_transactions.map((tx) => (
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
                      <td className="p-4 text-gray-300">{tx.concert_name}</td>
                      <td className="p-4 text-right text-gray-300">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.status === "success"
                              ? "bg-green-500/10 text-green-400"
                              : tx.status === "pending"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-400 text-xs">
                        {formatDate(tx.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <p className="text-4xl mb-4">📋</p>
              <p>Belum ada transaksi</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
