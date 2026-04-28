"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { logoutJwt, getCurrentUser, clearCache } from "@/lib/auth";
import { getAdminUsers } from "@/lib/api";
import type { User, AdminUserItem } from "@/types";

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers(
        page,
        perPage,
        roleFilter || undefined,
        searchQuery || undefined
      );
      setUsers(data.users);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, searchQuery]);

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
    if (!checking && user) fetchUsers();
  }, [checking, user, fetchUsers]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logoutJwt(); } catch { clearCache(); }
    router.replace("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleRoleChange = (newRole: string) => {
    setPage(1);
    setRoleFilter(newRole);
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
              { href: "/admin/transactions", label: "Transaksi", active: false },
              { href: "/admin/users", label: "Pengguna", active: true },
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
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Manajemen Pengguna</h1>
          <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 15 }}>{total} pengguna terdaftar dalam sistem</p>
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
              placeholder="Cari nama atau email..."
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

          {/* Role Filter */}
          <div style={{ position: "relative" }}>
            <select
              value={roleFilter}
              onChange={(e) => handleRoleChange(e.target.value)}
              style={{
                padding: "14px 40px 14px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 14, outline: "none", minWidth: "200px",
                cursor: "pointer", appearance: "none", transition: "all 0.2s"
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#a78bfa"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              {[
                { value: "", label: "Semua Role" },
                { value: "admin", label: "Admin" },
                { value: "customer", label: "Customer" },
              ].map((opt) => (
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

        {/* User Table section */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", minHeight: 400 }}>
          {loading ? (
            <div style={{ padding: "80px 24px", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ color: "#9ca3af", marginTop: 16 }}>Memuat data pengguna...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: "80px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 48, margin: "0 0 16px", opacity: 0.5 }}>👥</p>
              <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Tidak ada pengguna ditemukan</p>
              <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Ubah kata kunci pencarian atau filter role.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>Data Pengguna</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Role</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Tiket Dibeli</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Total Belanja</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={u.id} style={{
                      borderBottom: idx < users.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "16px 24px" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)", color: "#e879f9", fontWeight: "bold", flexShrink: 0 }}>
                              {u.full_name ? u.full_name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div>
                               <p style={{ fontWeight: 600, color: "#fff", margin: "0 0 4px", fontSize: 14 }}>{u.full_name}</p>
                               <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>{u.email}</p>
                            </div>
                         </div>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: u.role === "admin" ? "rgba(168,85,247,0.12)" : "rgba(59,130,246,0.12)",
                          color: u.role === "admin" ? "#d8b4fe" : "#93c5fd", textTransform: "capitalize"
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "center", color: "#d1d5db" }}>
                        {u.total_tickets > 0 ? (
                            <span style={{ display: "inline-block", padding: "4px 10px", background: "rgba(255,255,255,0.05)", borderRadius: 6, fontWeight: 600, fontSize: 13 }}>
                                🎫 {u.total_tickets}
                            </span>
                        ) : (
                            <span style={{ color: "#6b7280" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <p style={{ fontWeight: 600, color: u.total_spent > 0 ? "#10b981" : "#6b7280", margin: 0 }}>
                            {formatCurrency(u.total_spent)}
                        </p>
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
