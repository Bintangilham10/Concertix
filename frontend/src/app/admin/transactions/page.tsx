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
    let bg = "rgba(107,114,128,0.12)";
    let color = "#9ca3af";
    
    if (status === "success") {
      bg = "rgba(16,185,129,0.12)";
      color = "#34d399";
    } else if (status === "pending") {
      bg = "rgba(245,158,11,0.12)";
      color = "#fbbf24";
    } else if (status === "failed") {
      bg = "rgba(239,68,68,0.12)";
      color = "#f87171";
    } else if (status === "expired") {
      bg = "rgba(107,114,128,0.12)";
      color = "#9ca3af";
    } else if (status === "refunded") {
      bg = "rgba(59,130,246,0.12)";
      color = "#60a5fa";
    }

    return (
      <span style={{
        display: "inline-block", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
        background: bg, color: color, textTransform: "capitalize", whiteSpace: "nowrap"
      }}>
        {status}
      </span>
    );
  };

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#9ca3af" }}>Memverifikasi akses...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
              { href: "/admin", label: "Dashboard", active: false },
              { href: "/admin/concerts", label: "Konser", active: false },
              { href: "/admin/transactions", label: "Transaksi", active: true },
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
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Manajemen Transaksi</h1>
          <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 15 }}>{total} transaksi ditemukan dan tercatat dalam sistem</p>
        </div>

        {/* Actions bar */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Form */}
          <form onSubmit={handleSearch} style={{ display: "flex", flex: 1, position: "relative", minWidth: 300 }}>
            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 16 }}>
              🔍
            </span>
            <input 
              type="text" 
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)} 
              placeholder="Cari nama atau email pembeli..."
              style={{
                width: "100%", padding: "14px 16px 14px 44px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
                color: "#fff", fontSize: 14, outline: "none", transition: "all 0.2s"
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            />
            <button type="submit" style={{ display: "none" }}>Submit</button>
          </form>

          {/* Status Filter */}
          <div style={{ position: "relative" }}>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{
                padding: "14px 40px 14px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 14, outline: "none", minWidth: "200px",
                cursor: "pointer", appearance: "none", transition: "all 0.2s"
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#a78bfa"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: "#0a0a1a", color: "#fff", padding: "10px" }}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none", fontSize: 12 }}>
              ▼
            </span>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 24, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Transaction Table section */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", minHeight: 400 }}>
          {loading ? (
            <div style={{ padding: "80px 24px", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ color: "#9ca3af", marginTop: 16 }}>Memuat transaksi...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: "80px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 48, margin: "0 0 16px", opacity: 0.5 }}>📋</p>
              <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Tidak ada transaksi ditemukan</p>
              <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Ubah kata kunci pencarian atau filter status transaksi.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>ID & Tanggal</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>Pembeli</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>Konser</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Jumlah & Metode</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Status Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={tx.id} style={{
                      borderBottom: idx < transactions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px 24px", whiteSpace: "nowrap" }}>
                         <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 4px", fontFamily: "monospace" }}>#{tx.id.substring(0, 8)}</p>
                         <p style={{ color: "#d1d5db", margin: 0, fontSize: 13 }}>{formatDate(tx.created_at)}</p>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <p style={{ fontWeight: 600, color: "#fff", margin: "0 0 4px", fontSize: 14 }}>{tx.buyer_name}</p>
                        <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>{tx.buyer_email}</p>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <p style={{ fontWeight: 500, color: "#d1d5db", margin: "0 0 4px" }}>{tx.concert_name}</p>
                        <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>🎤 {tx.concert_artist}</p>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <p style={{ fontWeight: 600, color: "#c084fc", margin: "0 0 4px" }}>{formatCurrency(tx.amount)}</p>
                        <p style={{ color: "#6b7280", fontSize: 12, margin: 0, textTransform: "uppercase" }}>{tx.payment_type || "N/A"}</p>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "center" }}>
                        {statusBadge(tx.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Halaman <span style={{ color: "#fff", fontWeight: 600 }}>{page}</span> dari {totalPages}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={() => setPage((p) => Math.max(1, p - 1))} 
                  disabled={page <= 1}
                  style={{
                    padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#fff",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                    cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1, transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { if (page > 1) e.currentTarget.style.background = "rgba(255,255,255,0.1)" }}
                  onMouseLeave={(e) => { if (page > 1) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
                >
                  ← Sebelumnya
                </button>
                <button 
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                  disabled={page >= totalPages}
                  style={{
                    padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#fff",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                    cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1, transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => { if (page < totalPages) e.currentTarget.style.background = "rgba(255,255,255,0.1)" }}
                  onMouseLeave={(e) => { if (page < totalPages) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
                >
                  Selanjutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
