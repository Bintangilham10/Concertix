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
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a1033 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md" style={{ background: "rgba(10,10,26,0.85)" }}>
        <div className="max-w-[1100px] mx-auto px-5 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-extrabold bg-gradient-to-br from-[#a78bfa] to-[#ec4899] bg-clip-text text-transparent no-underline">
            Concertix
          </a>
          <a href="/" className="text-[#a78bfa] text-xs sm:text-sm font-medium no-underline hover:opacity-80">
            ← <span className="hidden sm:inline">Kembali ke Beranda</span><span className="inline sm:hidden">Kembali</span>
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1100px] mx-auto px-5 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 bg-gradient-to-br from-white to-[#a78bfa] bg-clip-text text-transparent">
          🎫 Tiket Saya
        </h1>
        <p className="text-[#9ca3af] mb-8 text-sm sm:text-base">
          Lihat dan kelola semua tiket konser yang telah kamu pesan
        </p>

        {loading && (
          <div className="text-center py-16 text-[#9ca3af]">
            <div className="text-3xl mb-3">⏳</div>
            Memuat tiket...
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-[#f87171]">
            <div className="text-3xl mb-3">❌</div>
            {error}
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="text-center py-16 px-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <div className="text-5xl mb-4">🎟</div>
            <h3 className="text-xl mb-2">Belum Ada Tiket</h3>
            <p className="text-[#9ca3af] mb-6">Kamu belum membeli tiket konser apapun.</p>
            <a href="/#tickets" className="inline-block px-7 py-3 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] rounded-xl text-white font-semibold text-sm hover:scale-105 transition-transform">
              Beli Tiket Sekarang →
            </a>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="flex flex-col gap-4">
            {tickets.map((ticket) => {
              const st = statusConfig[ticket.status] || statusConfig.pending;
              return (
                <div
                  key={ticket.id}
                  className="group flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 bg-white/5 border border-white/10 hover:border-[#8b5cf6]/40 rounded-2xl p-5 md:p-6 transition-colors"
                >
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Icon */}
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#8b5cf6]/30 to-[#ec4899]/30 flex items-center justify-center text-xl md:text-2xl shrink-0">
                      🎵
                    </div>
                    {/* Mobile Title & Badge Container */}
                    <div className="flex-1 md:hidden flex flex-col items-start gap-1">
                      <div className="font-bold text-lg leading-tight">{ticket.concert?.name || "Konser"}</div>
                      <div
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1"
                        style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}33` }}
                      >
                        {st.label}
                      </div>
                    </div>
                  </div>

                  {/* Info (Desktop handles Title) */}
                  <div className="flex-1 w-full md:w-auto">
                    <div className="hidden md:block font-bold text-[1.05rem] mb-1">
                      {ticket.concert?.name || "Konser"}
                    </div>
                    <div className="text-[#9ca3af] text-xs sm:text-[0.85rem]">
                      📍 {ticket.concert?.venue || "-"} <br className="sm:hidden" /> <span className="hidden sm:inline">·</span> 📅 {formatDate(ticket.concert?.date || "")}
                    </div>
                    <div className="text-[#6b7280] text-xs mt-1">
                      ID: {ticket.id.substring(0, 8)}...
                    </div>
                  </div>

                  {/* Desktop Badge */}
                  <div
                    className="hidden md:block px-4 py-1.5 rounded-full text-[0.8rem] font-semibold whitespace-nowrap"
                    style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}33` }}
                  >
                    {st.label}
                  </div>

                  {/* Price & Actions Container */}
                  <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4 mt-2 md:mt-0 pt-3 md:pt-0 border-t border-white/5 md:border-none">
                    {/* Price */}
                    <div className="font-bold text-[#a78bfa] text-base md:text-[1.1rem]">
                      {formatRupiah(ticket.concert?.price || 0)}
                    </div>

                    {/* Download Button */}
                    {ticket.status === "paid" && (
                      <button
                        onClick={() => handleDownloadPdf(ticket.id)}
                        className="px-4 py-2 md:py-2.5 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] rounded-xl text-white font-semibold text-xs md:text-[0.85rem] whitespace-nowrap hover:scale-105 hover:shadow-[0_4px_20px_rgba(124,58,237,0.4)] transition-all cursor-pointer border-none"
                      >
                        📄 <span className="hidden sm:inline">E-Ticket</span><span className="inline sm:hidden">Unduh</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
