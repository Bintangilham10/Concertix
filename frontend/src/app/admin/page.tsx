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
        if (!currentUser) { router.replace("/login"); return; }
        if (currentUser.role !== "admin") { router.replace("/"); return; }
        setUser(currentUser);
        setChecking(false);
        try {
          const data = await getAdminStats();
          setStats(data);
        } catch (err) {
          setStatsError(err instanceof Error ? err.message : "Gagal memuat statistik");
        }
      } catch { router.replace("/login"); }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logoutJwt(); } catch { clearCache(); }
    router.replace("/login");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#9ca3af" }}>Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#fff", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(10,10,26,0.85)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/" style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textDecoration: "none" }}>
              Concertix
            </Link>
            <span style={{ padding: "2px 10px", background: "rgba(124,58,237,0.15)", color: "#c084fc", fontSize: 11, fontWeight: 600, borderRadius: 100, border: "1px solid rgba(124,58,237,0.3)" }}>
              Admin
            </span>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[
              { href: "/admin", label: "Dashboard", active: true },
              { href: "/admin/concerts", label: "Konser", active: false },
              { href: "/admin/transactions", label: "Transaksi", active: false },
              { href: "/admin/users", label: "Pengguna", active: false },
              { href: "/admin/scan", label: "Scan Tiket", active: false },
            ].map((item) => (
              <a key={item.href} href={item.href} style={{
                fontSize: 13, fontWeight: item.active ? 600 : 500, textDecoration: "none",
                color: item.active ? "#fff" : "#9ca3af",
                borderBottom: item.active ? "2px solid #7c3aed" : "2px solid transparent",
                paddingBottom: 4,
              }}>
                {item.label}
              </a>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {user && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{user.full_name}</p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{user.email}</p>
              </div>
            )}
            <button onClick={handleLogout} disabled={loggingOut} style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#f87171",
              background: "transparent", border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
            }}>
              {loggingOut ? "Keluar..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Dashboard Admin</h1>
          {user && <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 15 }}>Selamat datang, {user.full_name} 👋</p>}
        </div>

        {/* Error */}
        {statsError && (
          <div style={{ marginBottom: 24, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 14 }}>
            ⚠️ {statsError}
          </div>
        )}

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 40 }}>
          {[
            { label: "Total Konser", value: stats ? String(stats.total_concerts) : "—", icon: "🎵", gradient: "linear-gradient(135deg, #7c3aed22, #7c3aed08)" },
            { label: "Tiket Terjual", value: stats ? String(stats.total_tickets_sold) : "—", icon: "🎫", gradient: "linear-gradient(135deg, #3b82f622, #3b82f608)" },
            { label: "Pendapatan", value: stats ? formatCurrency(stats.total_revenue) : "—", icon: "💰", gradient: "linear-gradient(135deg, #10b98122, #10b98108)" },
            { label: "Pengguna", value: stats ? String(stats.total_users) : "—", icon: "👥", gradient: "linear-gradient(135deg, #f59e0b22, #f59e0b08)" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: stat.gradient,
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16, padding: 24,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{stat.label}</span>
                <span style={{ fontSize: 28 }}>{stat.icon}</span>
              </div>
              <p style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── Concert Table ── */}
        {stats && stats.concerts.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, marginBottom: 32, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>📋 Daftar Konser</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Nama Konser", "Artis", "Venue", "Harga", "Terjual", "Sisa"].map((h, i) => (
                      <th key={h} style={{
                        padding: "14px 20px", fontWeight: 600, fontSize: 12,
                        color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px",
                        textAlign: i >= 3 ? "right" : "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.concerts.map((concert, idx) => (
                    <tr key={concert.id} style={{
                      borderBottom: idx < stats.concerts.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px 20px", fontWeight: 600, color: "#fff" }}>{concert.name}</td>
                      <td style={{ padding: "16px 20px", color: "#d1d5db" }}>{concert.artist}</td>
                      <td style={{ padding: "16px 20px", color: "#d1d5db" }}>{concert.venue}</td>
                      <td style={{ padding: "16px 20px", textAlign: "right", color: "#d1d5db" }}>{formatCurrency(concert.price)}</td>
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <span style={{
                          display: "inline-block", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: concert.tickets_sold > 0 ? "rgba(16,185,129,0.12)" : "rgba(156,163,175,0.1)",
                          color: concert.tickets_sold > 0 ? "#34d399" : "#9ca3af",
                        }}>
                          {concert.tickets_sold}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "right", color: "#9ca3af", fontSize: 13 }}>
                        {concert.available_tickets} / {concert.quota}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Recent Transactions ── */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>💳 Transaksi Terbaru</h2>
          </div>
          {stats && stats.recent_transactions.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Pembeli", "Konser", "Jumlah", "Status", "Tanggal"].map((h, i) => (
                      <th key={h} style={{
                        padding: "14px 20px", fontWeight: 600, fontSize: 12,
                        color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px",
                        textAlign: i === 2 ? "right" : i === 3 ? "center" : i === 4 ? "right" : "left",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px 20px" }}>
                        <p style={{ fontWeight: 600, color: "#fff", margin: 0, fontSize: 14 }}>{tx.buyer_name}</p>
                        <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 12 }}>{tx.buyer_email}</p>
                      </td>
                      <td style={{ padding: "16px 20px", color: "#d1d5db" }}>{tx.concert_name}</td>
                      <td style={{ padding: "16px 20px", textAlign: "right", color: "#d1d5db" }}>{formatCurrency(tx.amount)}</td>
                      <td style={{ padding: "16px 20px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: tx.status === "success" ? "rgba(16,185,129,0.12)" : tx.status === "pending" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                          color: tx.status === "success" ? "#34d399" : tx.status === "pending" ? "#fbbf24" : "#f87171",
                        }}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "right", color: "#6b7280", fontSize: 12 }}>
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 48, margin: "0 0 12px" }}>📋</p>
              <p style={{ color: "#6b7280", fontSize: 15, margin: 0 }}>Belum ada transaksi</p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
