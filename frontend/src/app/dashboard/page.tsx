"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { orderTicket, createPayment, getMyTickets } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { startMidtransPayment } from "@/lib/midtrans";

const CONCERT_IDS: Record<string, string> = {
  VIP: "a5ec93d2-7c9d-4936-983e-5c6a6a9f3a5c",
  Regular: "e541329f-0d25-46d5-b1ea-b4ae8dd649e5",
};

interface ToastData {
  icon: string;
  title: string;
  msg: string;
}

interface UserTicketSummary {
  concert_id: string;
  status: string;
}

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function DashboardTickets() {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("VIP");
  const [modalPriceStr, setModalPriceStr] = useState("Rp 1.000");
  const [currentPrice, setCurrentPrice] = useState(1000);
  const qty = 1;

  // Form state
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+62");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [nameError, setNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  // Checkout button state
  const [checkoutText, setCheckoutText] = useState("Lanjut ke Pembayaran →");
  const [checkoutDisabled, setCheckoutDisabled] = useState(false);
  const [checkoutStyle, setCheckoutStyle] = useState<React.CSSProperties>({});
  const [orderedConcertIds, setOrderedConcertIds] = useState<string[]>([]);
  const [activeTicketStatus, setActiveTicketStatus] = useState<string | null>(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData, setToastData] = useState<ToastData>({
    icon: "✓",
    title: "Berhasil!",
    msg: "Tiket telah ditambahkan.",
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback(
    (icon: string, title: string, msg: string, duration = 3500) => {
      setToastData({ icon, title, msg });
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), duration);
    },
    [],
  );

  const hasExistingTicket = useCallback(
    () => orderedConcertIds.length > 0,
    [orderedConcertIds],
  );

  const openModal = useCallback((type: string, priceStr: string, price: number) => {
    if (hasExistingTicket()) {
      const message = activeTicketStatus === "pending"
        ? "Akun ini sudah memiliki tiket pending. Batalkan tiket pending di halaman Tiket Saya untuk memilih tiket lain."
        : "Akun ini sudah memiliki tiket. Setiap akun hanya boleh memiliki 1 tiket.";
      showToast(
        "!",
        "Tidak Bisa Pesan Lagi",
        message,
        5000,
      );
      return;
    }

    setModalType(type);
    setModalPriceStr(priceStr);
    setCurrentPrice(price);
    setBuyerName("");
    setBuyerEmail("");
    setBuyerPhone("");
    setNameError(false);
    setEmailError(false);
    setPhoneError(false);
    setCheckoutText("Lanjut ke Pembayaran →");
    setCheckoutDisabled(false);
    setCheckoutStyle({});
    setModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, [activeTicketStatus, hasExistingTicket, showToast]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [closeModal]);

  useEffect(() => {
    async function loadExistingTickets() {
      const user = await getCurrentUser();
      if (!user) return;

      const tickets = await getMyTickets() as UserTicketSummary[];
      const blockingStatuses = new Set(["pending", "paid", "used"]);
      const activeTickets = tickets.filter((ticket) => blockingStatuses.has(ticket.status));
      setOrderedConcertIds(
        activeTickets.map((ticket) => ticket.concert_id),
      );
      setActiveTicketStatus(activeTickets[0]?.status ?? null);
    }

    loadExistingTickets().catch(() => {
      setOrderedConcertIds([]);
      setActiveTicketStatus(null);
    });
  }, []);

  const handleCheckout = async () => {
    const user = await getCurrentUser();
    if (!user) {
      showToast("⚠️", "Login Diperlukan", "Sesi Anda telah berakhir.", 3000);
      return;
    }

    const nOk = buyerName.trim().length > 1;
    const eOk = buyerEmail.includes("@") && buyerEmail.includes(".");
    const pOk = buyerPhone.trim().length >= 8;

    setNameError(!nOk);
    setEmailError(!eOk);
    setPhoneError(!pOk);

    if (!nOk || !eOk || !pOk) {
      showToast("⚠️", "Periksa Form", "Ada data yang belum diisi dengan benar.", 3000);
      return;
    }

    setCheckoutText("Memproses Pesanan...");
    setCheckoutDisabled(true);

    try {
      const concertId = CONCERT_IDS[modalType];
      if (!concertId) throw new Error("Tipe tiket tidak valid");
      if (orderedConcertIds.includes(concertId)) {
        throw new Error("Akun ini sudah memiliki tiket untuk kategori tersebut");
      }

      const ticketResult = await orderTicket(concertId, qty) as { id: string } | { id: string }[];
      const ticketId = Array.isArray(ticketResult) ? ticketResult[0].id : ticketResult.id;
      setOrderedConcertIds((prev) => Array.from(new Set([...prev, concertId])));
      setActiveTicketStatus("pending");

      setCheckoutText("Membuat Pembayaran...");
      const paymentResult = await createPayment(ticketId) as { redirect_url: string; snap_token: string };

      setCheckoutText("Membuka pembayaran...");
      setCheckoutStyle({ background: "linear-gradient(135deg, #10B981, #059669)" });
      showToast("🎉", "Pembayaran Dibuat!", "Popup Midtrans akan terbuka.", 4000);

      await startMidtransPayment({
        snapToken: paymentResult.snap_token,
        redirectUrl: paymentResult.redirect_url,
        onSuccess: () => {
          setModalOpen(false);
          showToast("🎉", "Pembayaran Berhasil", "Mengarahkan ke Tiket Saya.", 4000);
          window.location.href = "/dashboard/my-tickets";
        },
        onPending: () => {
          setModalOpen(false);
          showToast("⏳", "Pembayaran Diproses", "Cek status tiket di Tiket Saya.", 4000);
          window.location.href = "/dashboard/my-tickets";
        },
        onError: () => {
          showToast("❌", "Pembayaran Gagal", "Silakan coba lagi dari Tiket Saya.", 5000);
          setCheckoutText("Lanjut ke Pembayaran →");
          setCheckoutDisabled(false);
          setCheckoutStyle({});
        },
        onClose: () => {
          showToast("ℹ", "Pembayaran Ditutup", "Pesanan sudah dibuat. Lanjutkan pembayaran dari tab ini bila diperlukan.", 5000);
          setCheckoutText("Lanjut ke Pembayaran →");
          setCheckoutDisabled(false);
          setCheckoutStyle({});
        },
        onFallback: () => {
          setModalOpen(false);
          showToast("ℹ", "Pembayaran Dibuka di Tab Baru", "Selesaikan pembayaran, lalu kembali ke tab Concertix ini.", 6000);
          setCheckoutText("Lanjut ke Pembayaran →");
          setCheckoutDisabled(false);
          setCheckoutStyle({});
        },
      });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memproses pesanan";
      const isLimitError = message.toLowerCase().includes("sudah memiliki tiket")
        || message.toLowerCase().includes("hanya dapat memesan")
        || message.toLowerCase().includes("hanya boleh");
      showToast(
        isLimitError ? "!" : "❌",
        isLimitError ? "Tidak Bisa Pesan Lagi" : "Gagal",
        isLimitError ? "Akun ini sudah memiliki tiket. Setiap user hanya boleh memesan 1 tiket." : message,
        5000,
      );
      setCheckoutText("Lanjut ke Pembayaran →");
      setCheckoutDisabled(false);
      setCheckoutStyle({});
    }
  };

  const vipAlreadyOrdered = hasExistingTicket();
  const regularAlreadyOrdered = hasExistingTicket();

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Pembelian Tiket</h1>
        <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 15 }}>
          Pesan tiket Konser Bandung Raya 2026. Pilih kategori tiket di bawah ini.
        </p>
        {orderedConcertIds.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.28)", color: "#fbbf24", fontSize: 14, fontWeight: 600 }}>
            {activeTicketStatus === "pending"
              ? "Akun ini sudah memiliki tiket pending. Batalkan dulu di halaman Tiket Saya jika ingin memilih tiket lain."
              : "Akun ini sudah memiliki tiket. Setiap akun hanya boleh memiliki 1 tiket."}
          </div>
        )}
      </div>

      <div className="tickets-grid" style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {/* VIP Ticket */}
        <article className="ticket-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, position: "relative" }}>
          <div className="ticket-top" style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="ticket-category-badge" style={{ background: "rgba(234, 179, 8, 0.2)", color: "#fef08a", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>⭐ VIP</span>
            <span className="avail-badge" style={{ color: vipAlreadyOrdered ? "#fbbf24" : "#ef4444", fontSize: 12, fontWeight: 600 }}>{vipAlreadyOrdered ? "Sudah Dipesan" : "Limited Seats"}</span>
          </div>
          <div className="ticket-type" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>VIP ACCESS</div>
          <div className="ticket-location" style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>Lapangan Gasibu · Zona Eksklusif Depan Panggung</div>
          <div className="ticket-price" style={{ fontSize: 24, fontWeight: 800, color: "#eab308", marginBottom: 24 }}>Rp 1.000<sub style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>/tiket</sub></div>
          <ul className="benefits-list" style={{ listStyle: "none", padding: 0, margin: "0 0 24px", color: "#d1d5db", fontSize: 14 }}>
            <li style={{ marginBottom: 8 }}>✨ Front Zone Access</li>
            <li style={{ marginBottom: 8 }}>✨ Meet & Greet dengan Artis</li>
            <li style={{ marginBottom: 8 }}>✨ Exclusive Merchandise</li>
            <li style={{ marginBottom: 8 }}>✨ Early Entry</li>
            <li style={{ marginBottom: 8 }}>✨ VIP Lounge Access</li>
            <li style={{ marginBottom: 8 }}>✨ Priority Parking</li>
          </ul>
          <button disabled={vipAlreadyOrdered} className="btn-primary" onClick={() => openModal("VIP", "Rp 1.000", 1000)} style={{ width: "100%", padding: 14, borderRadius: 12, background: vipAlreadyOrdered ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #eab308, #ca8a04)", border: "none", color: "#fff", fontWeight: 700, cursor: vipAlreadyOrdered ? "not-allowed" : "pointer", opacity: vipAlreadyOrdered ? 0.7 : 1 }}>
            {vipAlreadyOrdered ? "Sudah Punya Tiket" : "Beli Tiket VIP"}
          </button>
        </article>

        {/* Regular Ticket */}
        <article className="ticket-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, position: "relative" }}>
          <div className="ticket-top" style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="ticket-category-badge" style={{ background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>🎟 Regular</span>
            <span className="avail-badge" style={{ color: regularAlreadyOrdered ? "#fbbf24" : "#10b981", fontSize: 12, fontWeight: 600 }}>{regularAlreadyOrdered ? "Sudah Dipesan" : "Available"}</span>
          </div>
          <div className="ticket-type" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>REGULAR ENTRY</div>
          <div className="ticket-location" style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>Lapangan Gasibu · Zona Festival Luas</div>
          <div className="ticket-price" style={{ fontSize: 24, fontWeight: 800, color: "#3b82f6", marginBottom: 24 }}>Rp 500<sub style={{ fontSize: 12, color: "#9ca3af", fontWeight: 400 }}>/tiket</sub></div>
          <ul className="benefits-list" style={{ listStyle: "none", padding: 0, margin: "0 0 24px", color: "#d1d5db", fontSize: 14 }}>
            <li style={{ marginBottom: 8 }}>✨ General Admission</li>
            <li style={{ marginBottom: 8 }}>✨ Merchandise</li>
            <li style={{ marginBottom: 8 }}>✨ Free Parking</li>
            <li style={{ marginBottom: 8 }}>✨ Access to Food Court</li>
          </ul>
          <button disabled={regularAlreadyOrdered} className="btn-primary" onClick={() => openModal("Regular", "Rp 500", 500)} style={{ width: "100%", padding: 14, borderRadius: 12, background: regularAlreadyOrdered ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #3b82f6, #2563eb)", border: "none", color: "#fff", fontWeight: 700, cursor: regularAlreadyOrdered ? "not-allowed" : "pointer", marginTop: "auto", opacity: regularAlreadyOrdered ? 0.7 : 1 }}>
            {regularAlreadyOrdered ? "Sudah Punya Tiket" : "Beli Tiket Regular"}
          </button>
        </article>
      </div>

      {modalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="modal-content" style={{ background: "#1a1a2e", borderRadius: 20, width: "100%", maxWidth: 500, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", position: "relative" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Detail Pemesanan</h3>
              <button aria-label="Tutup form pemesanan" onClick={closeModal} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 24, padding: 0, lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 12, marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>Kategori Tiket</span>
                  <span style={{ fontWeight: 600 }}>{modalType}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>Harga Satuan</span>
                  <span style={{ fontWeight: 600 }}>{modalPriceStr}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 16 }}>
                  <span style={{ color: "#9ca3af", fontSize: 13 }}>Jumlah</span>
                  <span style={{ fontWeight: 600 }}>1 tiket per akun</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontWeight: 600 }}>Total Pembayaran</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: modalType === "VIP" ? "#eab308" : "#3b82f6" }}>{formatRupiah(currentPrice * qty)}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 8, color: "#d1d5db" }}>Nama Lengkap Sesuai KTP <span style={{ color: "#ef4444" }}>*</span></label>
                  <input ref={nameInputRef} type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Misal: Bintang Ilham" style={{ width: "100%", padding: "12px 16px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: nameError ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }} />
                  {nameError && <span style={{ color: "#ef4444", fontSize: 12, marginTop: 4, display: "block" }}>Nama wajib diisi</span>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 8, color: "#d1d5db" }}>Email Aktif <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="Misal: bintang@example.com" style={{ width: "100%", padding: "12px 16px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: emailError ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }} />
                  {emailError && <span style={{ color: "#ef4444", fontSize: 12, marginTop: 4, display: "block" }}>Email tidak valid</span>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, marginBottom: 8, color: "#d1d5db" }}>Nomor WhatsApp <span style={{ color: "#ef4444" }}>*</span></label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} style={{ padding: "12px 8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", outline: "none" }}>
                      <option value="+62">ID (+62)</option>
                    </select>
                    <input type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value.replace(/[^0-9]/g, ""))} placeholder="81234567890" style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: phoneError ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }} />
                  </div>
                  {phoneError && <span style={{ color: "#ef4444", fontSize: 12, marginTop: 4, display: "block" }}>Nomor HP terlalu pendek</span>}
                </div>
              </div>
            </div>
            <div style={{ padding: 24, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button disabled={checkoutDisabled} onClick={handleCheckout} style={{ ...checkoutStyle, width: "100%", padding: 14, borderRadius: 12, border: "none", color: "#fff", fontWeight: 700, cursor: checkoutDisabled ? "not-allowed" : "pointer", background: checkoutDisabled ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
                {checkoutText}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastVisible && (
        <div className="toast" style={{ position: "fixed", bottom: 24, right: 24, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 12, alignItems: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", zIndex: 1000, animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: toastData.icon === "✓" || toastData.icon === "🎉" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: toastData.icon === "✓" || toastData.icon === "🎉" ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{toastData.icon}</div>
          <div>
            <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600 }}>{toastData.title}</h4>
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>{toastData.msg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
