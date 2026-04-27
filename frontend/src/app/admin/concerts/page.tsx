"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { logoutJwt, getCurrentUser, clearCache } from "@/lib/auth";
import { createConcert, deleteConcert, getConcerts, updateConcert } from "@/lib/api";
import type { User, Concert, ConcertPayload } from "@/types";

const emptyConcertForm: ConcertPayload = {
  name: "",
  artist: "",
  description: "",
  venue: "",
  date: "",
  time: "",
  price: 0,
  quota: 1,
  image_url: "",
};

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
  const [formOpen, setFormOpen] = useState(false);
  const [editingConcert, setEditingConcert] = useState<Concert | null>(null);
  const [formData, setFormData] = useState<ConcertPayload>(emptyConcertForm);
  const [saving, setSaving] = useState(false);

  const fetchConcerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConcerts(page, perPage) as import("@/types").PaginatedResponse<Concert>;
      setConcerts(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data konser.");
    } finally {
      setLoading(false);
    }
  }, [page, perPage]);

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

  const toDatetimeLocal = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };

  const openCreateForm = () => {
    setEditingConcert(null);
    setFormData(emptyConcertForm);
    setFormOpen(true);
    setError(null);
  };

  const openEditForm = (concert: Concert) => {
    setEditingConcert(concert);
    setFormData({
      name: concert.name,
      artist: concert.artist,
      description: concert.description || "",
      venue: concert.venue,
      date: toDatetimeLocal(concert.date),
      time: concert.time || "",
      price: concert.price,
      quota: concert.quota,
      image_url: concert.image_url || "",
    });
    setFormOpen(true);
    setError(null);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingConcert(null);
    setFormData(emptyConcertForm);
  };

  const handleSaveConcert = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: ConcertPayload = {
        ...formData,
        price: Number(formData.price),
        quota: Number(formData.quota),
        image_url: formData.image_url?.trim() || undefined,
        description: formData.description?.trim() || undefined,
      };

      if (editingConcert) {
        await updateConcert(editingConcert.id, payload);
      } else {
        await createConcert(payload);
      }

      setFormOpen(false);
      setEditingConcert(null);
      setFormData(emptyConcertForm);
      await fetchConcerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan konser.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConcert = async (concert: Concert) => {
    const ok = window.confirm(`Hapus konser "${concert.name}"? Aksi ini tidak bisa dibatalkan.`);
    if (!ok) return;

    setError(null);
    try {
      await deleteConcert(concert.id);
      await fetchConcerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus konser.");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
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

  const filteredConcerts = concerts?.filter((c) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
              { href: "/admin/concerts", label: "Konser", active: true },
              { href: "/admin/transactions", label: "Transaksi", active: false },
              { href: "/admin/users", label: "Pengguna", active: false },
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
        {/* Title and Top Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Manajemen Konser</h1>
            <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 15 }}>Total ada {total || filteredConcerts.length} konser terdaftar yang siap dijual</p>
          </div>
          <button onClick={openCreateForm} style={{
            padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "#fff",
            background: "linear-gradient(135deg, #7c3aed, #ec4899)", borderRadius: 8,
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 14px rgba(124,58,237,0.3)"
          }}>
            <span>➕</span> Tambah Konser Baru
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: "flex", marginBottom: 32, position: "relative", maxWidth: 500 }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 16 }}>
            🔍
          </span>
          <input 
            type="text" 
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)} 
            placeholder="Cari nama konser atau artis..."
            style={{
              width: "100%", padding: "14px 16px 14px 44px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
              color: "#fff", fontSize: 14, outline: "none",
            }}
          />
          <button type="submit" style={{ display: "none" }}>Submit</button>
        </form>

        {error && (
          <div style={{ marginBottom: 24, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Concert Table section */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", minHeight: 400 }}>
          {loading ? (
            <div style={{ padding: "80px 24px", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ color: "#9ca3af", marginTop: 16 }}>Memuat katalog konser...</p>
            </div>
          ) : filteredConcerts.length === 0 ? (
            <div style={{ padding: "80px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 48, margin: "0 0 16px", opacity: 0.5 }}>🎸</p>
              <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Katalog masih kosong</p>
              <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Gunakan tombol 'Tambah Konser Baru' untuk memulai.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>Detail Konser</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>Tgl & Waktu</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "left" }}>Harga</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Kapasitas</th>
                    <th style={{ padding: "16px 24px", fontWeight: 600, fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConcerts.map((c, idx) => {
                    const sold = c.quota - c.available_tickets;
                    const percentSold = c.quota > 0 ? (sold / c.quota) * 100 : 0;
                    
                    return (
                      <tr key={c.id} style={{
                        borderBottom: idx < filteredConcerts.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        transition: "background 0.15s",
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                              {c.image_url ? (
                                <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <span style={{ fontSize: 20 }}>🎵</span>
                              )}
                            </div>
                            <div>
                               <p style={{ fontWeight: 700, color: "#fff", margin: "0 0 4px", fontSize: 15 }}>{c.name}</p>
                               <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 2px" }}>🎤 {c.artist}</p>
                               <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>📍 {c.venue}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px", color: "#d1d5db", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 500 }}>{formatDate(c.date)}</div>
                          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>Jam: {c.time || "TBA"}</div>
                        </td>
                        <td style={{ padding: "16px 24px", fontWeight: 600, color: "#c084fc", whiteSpace: "nowrap" }}>
                           {formatCurrency(c.price)}
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "center", minWidth: 140 }}>
                           <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                             <div style={{ fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.1)" }}>
                               <span style={{ color: "#fff" }}>{sold}</span> <span style={{ color: "#6b7280", margin: "0 4px" }}>/</span> <span style={{ color: "#9ca3af" }}>{c.quota}</span>
                             </div>
                             <div style={{ width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: 100, height: 6, overflow: "hidden" }}>
                               <div style={{
                                 height: "100%", borderRadius: 100,
                                 background: percentSold > 80 ? "#10b981" : "#a78bfa",
                                 width: `${percentSold}%`
                               }} />
                             </div>
                           </div>
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <button onClick={() => openEditForm(c)} style={{ padding: 8, background: "rgba(255,255,255,0.05)", border: "1px solid transparent", borderRadius: 8, cursor: "pointer", marginRight: 8, transition: "all 0.2s" }} title="Edit Konser"
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "transparent"; }}
                          >
                             ✏️
                          </button>
                          <button onClick={() => handleDeleteConcert(c)} style={{ padding: 8, background: "rgba(255,255,255,0.05)", border: "1px solid transparent", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }} title="Hapus Konser"
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "transparent"; }}
                          >
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Halaman <span style={{ color: "#fff", fontWeight: 600 }}>{page}</span> dari {totalPages}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
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
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
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

        {formOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <form onSubmit={handleSaveConcert} style={{ width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", background: "#111126", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{editingConcert ? "Edit Konser" : "Tambah Konser Baru"}</h2>
                <button type="button" onClick={closeForm} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                {[
                  ["name", "Nama Konser", "text"],
                  ["artist", "Artis", "text"],
                  ["venue", "Venue", "text"],
                  ["time", "Waktu", "text"],
                  ["price", "Harga", "number"],
                  ["quota", "Kuota", "number"],
                ].map(([name, label, type]) => (
                  <label key={name} style={{ display: "flex", flexDirection: "column", gap: 6, color: "#d1d5db", fontSize: 13, fontWeight: 600 }}>
                    {label}
                    <input
                      required
                      type={type}
                      min={type === "number" ? 0 : undefined}
                      value={String(formData[name as keyof ConcertPayload] ?? "")}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [name]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", outline: "none" }}
                    />
                  </label>
                ))}

                <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#d1d5db", fontSize: 13, fontWeight: 600 }}>
                  Tanggal
                  <input required type="datetime-local" value={formData.date} onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))} style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", outline: "none" }} />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#d1d5db", fontSize: 13, fontWeight: 600 }}>
                  URL Gambar
                  <input type="url" value={formData.image_url || ""} onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))} style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", outline: "none" }} />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#d1d5db", fontSize: 13, fontWeight: 600, marginTop: 14 }}>
                Deskripsi
                <textarea value={formData.description || ""} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={4} style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", outline: "none", resize: "vertical" }} />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button type="button" onClick={closeForm} disabled={saving} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#d1d5db", cursor: saving ? "not-allowed" : "pointer" }}>Batal</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "#fff", fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Menyimpan..." : "Simpan Konser"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        form input:focus {
          border-color: #a78bfa !important;
          background: rgba(255,255,255,0.05) !important;
        }
      `}</style>
    </div>
  );
}
