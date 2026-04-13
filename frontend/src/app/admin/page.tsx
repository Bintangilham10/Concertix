"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  logoutSupabase,
  getSupabaseUser,
  cacheUser,
  clearCache,
} from "@/lib/auth";
import type { User } from "@/types";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabaseUser = await getSupabaseUser();

        if (!supabaseUser) {
          router.replace("/login");
          return;
        }

        if (supabaseUser.role !== "admin") {
          router.replace("/");
          return;
        }

        cacheUser(supabaseUser);
        setUser(supabaseUser);
        setChecking(false);
      } catch {
        router.replace("/login");
      }
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutSupabase();
    } catch {
      // Even if server logout fails, clear local state
    }
    clearCache();
    router.replace("/login");
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
