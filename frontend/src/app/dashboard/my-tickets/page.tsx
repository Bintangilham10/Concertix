"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelTicket, createPayment, getMyTickets } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { startMidtransPayment } from "@/lib/midtrans";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://concertix-production.up.railway.app"
)
  .replace(/^http:\/\/concertix-production\.up\.railway\.app/i, "https://concertix-production.up.railway.app")
  .replace(/\/$/, "");

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
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

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

  const handleDownloadPdf = async (ticketId: string) => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Sesi login habis. Silakan login ulang.");
      return;
    }

    setDownloadingId(ticketId);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || "Gagal mengunduh e-ticket");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `concertix-ticket-${ticketId.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh e-ticket");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    const confirmed = window.confirm(
      "Batalkan tiket pending ini? Kuota akan dikembalikan dan kamu bisa memilih tiket lain.",
    );
    if (!confirmed) return;

    setCancellingId(ticketId);
    setError(null);
    setNotice(null);

    try {
      const updated = await cancelTicket(ticketId) as TicketItem;
      setTickets((current) =>
        current.map((ticket) => ticket.id === ticketId ? { ...ticket, status: updated.status } : ticket),
      );
      setNotice("Tiket pending berhasil dibatalkan. Kamu bisa memilih tiket lain di halaman Beli Tiket.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan tiket");
    } finally {
      setCancellingId(null);
    }
  };

  const handleContinuePayment = async (ticketId: string) => {
    setPayingId(ticketId);
    setError(null);
    setNotice(null);

    try {
      const paymentResult = await createPayment(ticketId) as {
        redirect_url: string;
        snap_token: string;
      };

      await startMidtransPayment({
        snapToken: paymentResult.snap_token,
        redirectUrl: paymentResult.redirect_url,
        onSuccess: () => {
          setNotice("Pembayaran berhasil. Jika status belum berubah, tunggu webhook Midtrans lalu refresh halaman.");
        },
        onPending: () => {
          setNotice("Pembayaran sedang diproses. Cek status tiket ini lagi setelah pembayaran selesai.");
        },
        onError: () => {
          setError("Pembayaran gagal. Silakan coba lanjut bayar lagi.");
        },
        onClose: () => {
          setNotice("Popup pembayaran ditutup. Tiket tetap pending dan masih bisa dilanjutkan dari tombol Lanjut Bayar.");
        },
        onFallback: () => {
          setNotice("Pembayaran dibuka di tab baru. Selesaikan pembayaran, lalu kembali ke halaman ini.");
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka pembayaran");
    } finally {
      setPayingId(null);
    }
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
    <div style={{ minHeight: "100vh", color: "#fff", background: "linear-gradient(180deg, #0a0a1a 0%, #1a1033 100%)" }}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, background: "linear-gradient(135deg, #fff, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🎫 Tiket Saya
        </h1>
        <p style={{ color: "#9ca3af", marginBottom: 32, fontSize: 15 }}>
          Lihat dan kelola semua tiket konser yang telah kamu pesan
        </p>

        {loading && (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Memuat tiket...
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#f87171" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            {error}
          </div>
        )}

        {notice && !error && (
          <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 10, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", fontSize: 14, fontWeight: 600 }}>
            {notice}
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 24px", background: "rgba(255,255,255,0.05)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎟</div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Belum Ada Tiket</h3>
            <p style={{ color: "#9ca3af", marginBottom: 24 }}>Kamu belum membeli tiket konser apapun.</p>
            <a href="/dashboard" style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", borderRadius: 12, color: "#fff", fontWeight: 600, textDecoration: "none" }}>
              Beli Tiket Sekarang →
            </a>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tickets.map((ticket) => {
              const st = statusConfig[ticket.status] || statusConfig.pending;
              return (
                <div key={ticket.id} className="ticket-item-card" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 250, flex: 1 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                      🎵
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 4 }}>
                        {ticket.concert?.name || "Konser"}
                      </div>
                      <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 4 }}>
                        📍 {ticket.concert?.venue || "-"} · 📅 {formatDate(ticket.concert?.date || "")}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        ID: {ticket.id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ padding: "6px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600, color: st.color, background: st.bg, border: `1px solid ${st.color}33` }}>
                      {st.label}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, minWidth: 150 }}>
                    <div style={{ fontWeight: 700, color: "#a78bfa", fontSize: "1.1rem" }}>
                      {formatRupiah(ticket.concert?.price || 0)}
                    </div>
                    {ticket.status === "paid" && (
                      <button disabled={downloadingId === ticket.id} onClick={() => handleDownloadPdf(ticket.id)} style={{ padding: "10px 16px", background: "linear-gradient(135deg, #7c3aed, #a855f7)", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, border: "none", cursor: downloadingId === ticket.id ? "wait" : "pointer", opacity: downloadingId === ticket.id ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                        📄 E-Ticket
                      </button>
                    )}
                    {ticket.status === "pending" && (
                      <>
                        <button disabled={payingId === ticket.id || cancellingId === ticket.id} onClick={() => handleContinuePayment(ticket.id)} style={{ padding: "10px 16px", background: "linear-gradient(135deg, #7c3aed, #ec4899)", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, border: "none", cursor: payingId === ticket.id ? "wait" : "pointer", opacity: payingId === ticket.id || cancellingId === ticket.id ? 0.7 : 1 }}>
                          {payingId === ticket.id ? "Membuka..." : "Lanjut Bayar"}
                        </button>
                        <button disabled={cancellingId === ticket.id || payingId === ticket.id} onClick={() => handleCancelTicket(ticket.id)} style={{ padding: "10px 16px", background: "rgba(248,113,113,0.12)", borderRadius: 10, color: "#fca5a5", fontWeight: 600, fontSize: 13, border: "1px solid rgba(248,113,113,0.35)", cursor: cancellingId === ticket.id ? "wait" : "pointer", opacity: cancellingId === ticket.id || payingId === ticket.id ? 0.7 : 1 }}>
                          {cancellingId === ticket.id ? "Membatalkan..." : "Batalkan"}
                        </button>
                      </>
                    )}
                    {ticket.status === "cancelled" && (
                      <a href="/dashboard" style={{ padding: "10px 16px", background: "rgba(124,58,237,0.16)", borderRadius: 10, color: "#c4b5fd", fontWeight: 600, fontSize: 13, textDecoration: "none", border: "1px solid rgba(167,139,250,0.32)" }}>
                        Pilih Tiket
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        @media (max-width: 640px) {
          .ticket-item-card {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .ticket-item-card > div {
             width: 100%;
             justify-content: flex-start !important;
          }
          .ticket-item-card > div:last-child {
             justify-content: space-between !important;
             border-top: 1px solid rgba(255,255,255,0.05);
             padding-top: 16px;
             margin-top: 8px;
          }
        }
      `}</style>
    </div>
  );
}
