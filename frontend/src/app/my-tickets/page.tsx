"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyTickets } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TicketItem {
  id: string;
  concert_id: string;
  status: string;
  created_at: string;
  concert?: {
    name: string;
    venue: string;
    date: string;
    time: string;
    price: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Menunggu Bayar", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  paid: { label: "Lunas ✓", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  used: { label: "Sudah Dipakai", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
  cancelled: { label: "Dibatalkan", color: "#f87171", bg: "rgba(248,113,113,0.15)" },
};

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }
        const data = await getMyTickets() as TicketItem[];
        setTickets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat tiket");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleDownloadPdf = (ticketId: string) => {
    const token = localStorage.getItem("access_token");
    const url = `${API_BASE_URL}/tickets/${ticketId}/pdf`;
    // Open in new tab with auth
    window.open(url + `?token=${token}`, "_blank");
  };

  const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("id-ID", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0a1a 0%, #1a1033 100%)",
      color: "#fff",
    }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,10,26,0.85)",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <a
            href="/"
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #a78bfa, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textDecoration: "none",
            }}
          >
            Concertix
          </a>
          <a
            href="/"
            style={{
              color: "#a78bfa",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            ← Kembali ke Beranda
          </a>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{
          fontSize: "2rem",
          fontWeight: 800,
          marginBottom: "8px",
          background: "linear-gradient(135deg, #fff, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          🎫 Tiket Saya
        </h1>
        <p style={{ color: "#9ca3af", marginBottom: "32px" }}>
          Lihat dan kelola semua tiket konser yang telah kamu pesan
        </p>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
            Memuat tiket...
          </div>
        )}

        {error && (
          <div style={{
            textAlign: "center",
            padding: "60px 0",
            color: "#f87171",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>❌</div>
            {error}
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "80px 24px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "16px",
            border: "1px dashed rgba(255,255,255,0.1)",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎟</div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px" }}>Belum Ada Tiket</h3>
            <p style={{ color: "#9ca3af", marginBottom: "20px" }}>
              Kamu belum membeli tiket konser apapun.
            </p>
            <a
              href="/#tickets"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                borderRadius: "10px",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
              }}
            >
              Beli Tiket Sekarang →
            </a>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {tickets.map((ticket) => {
              const st = statusConfig[ticket.status] || statusConfig.pending;
              return (
                <div
                  key={ticket.id}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "24px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "20px",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                >
                  {/* Icon */}
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    flexShrink: 0,
                  }}>
                    🎵
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "4px" }}>
                      {ticket.concert?.name || "Konser"}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                      📍 {ticket.concert?.venue || "-"} · 📅 {formatDate(ticket.concert?.date || "")}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "4px" }}>
                      ID: {ticket.id.substring(0, 8)}...
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: "right", minWidth: "120px" }}>
                    <div style={{ fontWeight: 700, color: "#a78bfa", fontSize: "1.1rem" }}>
                      {formatRupiah(ticket.concert?.price || 0)}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: st.color,
                    background: st.bg,
                    border: `1px solid ${st.color}33`,
                    whiteSpace: "nowrap",
                  }}>
                    {st.label}
                  </div>

                  {/* Download Button */}
                  {ticket.status === "paid" && (
                    <button
                      onClick={() => handleDownloadPdf(ticket.id)}
                      style={{
                        padding: "10px 20px",
                        background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                        border: "none",
                        borderRadius: "10px",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.03)";
                        e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      📄 Download E-Ticket
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
