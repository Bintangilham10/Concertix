"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { orderTicket, createPayment } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

const CONCERT_IDS: Record<string, string> = {
  VIP: "a5ec93d2-7c9d-4936-983e-5c6a6a9f3a5c",
  Regular: "e541329f-0d25-46d5-b1ea-b4ae8dd649e5",
};

interface ToastData {
  icon: string;
  title: string;
  msg: string;
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
  const [qty, setQty] = useState(1);

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

  const openModal = useCallback((type: string, priceStr: string, price: number) => {
    setModalType(type);
    setModalPriceStr(priceStr);
    setCurrentPrice(price);
    setQty(1);
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
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [closeModal]);

  const changeQty = (delta: number) => {
    setQty((prev) => Math.max(1, Math.min(2, prev + delta)));
  };

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

      const ticketResult = await orderTicket(concertId, qty) as { id: string } | { id: string }[];
      const ticketId = Array.isArray(ticketResult) ? ticketResult[0].id : ticketResult.id;

      setCheckoutText("Membuat Pembayaran...");
      const paymentResult = await createPayment(ticketId) as { redirect_url: string; snap_token: string };

      setCheckoutText("✓ Dialihkan ke Midtrans...");
      setCheckoutStyle({ background: "linear-gradient(135deg, #10B981, #059669)" });
      showToast("🎉", "Pembayaran Dibuat!", "Kamu akan diarahkan ke halaman Midtrans.", 4000);

      setTimeout(() => {
        window.location.href = paymentResult.redirect_url;
      }, 1500);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memproses pesanan";
      showToast("❌", "Gagal", message, 4000);
      setCheckoutText("Lanjut ke Pembayaran →");
      setCheckoutDisabled(false);
      setCheckoutStyle({});
    }
  };

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Pembelian Tiket</h1>
        <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 15 }}>
          Pesan tiket Konser Bandung Raya 2026. Pilih kategori tiket di bawah ini.
        </p>
      </div>

      <div className="tickets-grid" role="list" style={{ marginTop: 24 }}>
        {/* VIP TICKET */}
        <article
          className="ticket-card tc-vip"
          role="listitem"
          tabIndex={0}
          aria-label="Tiket VIP, harga Rp 1.000, 1.000 tiket tersedia"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal("VIP", "Rp 1.000", 1000);
            }
          }}
        >
          <div className="ticket-glow" aria-hidden="true"></div>
          <div className="ticket-shine" aria-hidden="true"></div>
          <div className="ticket-inner">
            <div className="ticket-top">
              <span className="ticket-category-badge">⭐ VIP</span>
              <span className="avail-badge avail-limited">
                <span className="avail-dot" aria-hidden="true"></span>
                Limited Seats
              </span>
            </div>
            <div className="ticket-type">VIP ACCESS</div>
            <div className="ticket-location">
              Lapangan Gasibu · Zona Eksklusif Depan Panggung
            </div>
            <div className="perf-divider" aria-hidden="true">
              <div className="perf-notch"></div>
              <div className="perf-line"></div>
              <div className="perf-notch"></div>
            </div>
            <div className="ticket-price">
              Rp 1.000<sub>/tiket</sub>
            </div>
            <div className="progress-wrap">
              <div className="progress-labels">
                <span>
                  Tiket Terjual: <strong>0</strong>
                </span>
                <span>0%</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="0% tiket VIP terjual"
              >
                <div
                  className="progress-fill"
                  style={{ width: "0%" }}
                ></div>
              </div>
              <div className="ticket-count" aria-live="polite">
                1.000 tiket tersedia <span>dari 1.000</span>
              </div>
            </div>
            <ul
              className="benefits-list"
              aria-label="Keuntungan tiket VIP"
            >
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                Front Zone Access
              </li>
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                Meet &amp; Greet dengan Artis
              </li>
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                Exclusive Merchandise
              </li>
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                Early Entry
              </li>
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                VIP Lounge Access
              </li>
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                Priority Parking
              </li>
            </ul>
            <button
              className="ticket-btn"
              onClick={() => openModal("VIP", "Rp 1.000", 1000)}
              aria-label="Beli tiket VIP seharga Rp 1.000"
            >
              Beli Tiket VIP →
            </button>
          </div>
        </article>

        {/* REGULAR TICKET */}
        <article
          className="ticket-card tc-regular"
          role="listitem"
          tabIndex={0}
          aria-label="Tiket Regular, harga Rp 500, 3.000 tiket tersedia"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal("Regular", "Rp 500", 500);
            }
          }}
        >
          <div className="ticket-glow" aria-hidden="true"></div>
          <div className="ticket-shine" aria-hidden="true"></div>
          <div className="ticket-inner">
            <div className="ticket-top">
              <span className="ticket-category-badge">🎟 Regular</span>
              <span className="avail-badge avail-ok">
                <span className="avail-dot" aria-hidden="true"></span>
                Available
              </span>
            </div>
            <div className="ticket-type">REGULAR ENTRY</div>
            <div className="ticket-location">
              Lapangan Gasibu · Zona Festival Luas
            </div>
            <div className="perf-divider" aria-hidden="true">
              <div className="perf-notch"></div>
              <div className="perf-line"></div>
              <div className="perf-notch"></div>
            </div>
            <div className="ticket-price">
              Rp 500<sub>/tiket</sub>
            </div>
            <div className="progress-wrap">
              <div className="progress-labels">
                <span>
                  Tiket Terjual: <strong>0</strong>
                </span>
                <span>0%</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="0% tiket Regular terjual"
              >
                <div
                  className="progress-fill"
                  style={{ width: "0%" }}
                ></div>
              </div>
              <div className="ticket-count" aria-live="polite">
                3.000 tiket tersedia <span>dari 3.000</span>
              </div>
            </div>
            <ul
              className="benefits-list"
              aria-label="Keuntungan tiket Regular"
            >
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                General Admission
              </li>
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                Merchandise
              </li>
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                Free Parking
              </li>
              <li>
                <span className="benefit-icon" aria-hidden="true"></span>
                Access to Food Court
              </li>
            </ul>
            <button
              className="ticket-btn"
              onClick={() => openModal("Regular", "Rp 500", 500)}
              aria-label="Beli tiket Regular seharga Rp 500"
            >
              Beli Tiket Regular →
            </button>
          </div>
        </article>
      </div>

      {/* ══════════════ CHECKOUT MODAL ══════════════ */}
      <div
        className={`modal-overlay${modalOpen ? " open" : ""}`}
        id="checkoutModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title-text"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="modal-box">
          <div className="modal-header">
            <h2 className="modal-title" id="modal-title-text">
              PESAN TIKET
            </h2>
            <button
              className="modal-close"
              onClick={closeModal}
              aria-label="Tutup dialog pembelian tiket"
            >
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="selected-ticket">
              <div className="st-left">
                <small>Kategori Tiket</small>
                <strong id="modal-type">{modalType} Access</strong>
                <em>Lapangan Gasibu · 2026</em>
              </div>
              <div className="st-right">
                <small>Harga / tiket</small>
                <div className="st-price" id="modal-price">
                  {modalPriceStr}
                </div>
              </div>
            </div>
            <div
              className="qty-control"
              role="group"
              aria-label="Pilih jumlah tiket"
            >
              <div className="qty-label">Jumlah Tiket</div>
              <button
                className="qty-btn"
                onClick={() => changeQty(-1)}
                aria-label="Kurangi jumlah tiket"
              >
                −
              </button>
              <div
                className="qty-number"
                id="qty-display"
                aria-live="polite"
                aria-atomic="true"
              >
                {qty}
              </div>
              <button
                className="qty-btn"
                onClick={() => changeQty(1)}
                aria-label="Tambah jumlah tiket"
              >
                +
              </button>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="buyer-name">
                Nama Lengkap
              </label>
              <input
                ref={nameInputRef}
                className={`form-input${nameError ? " error" : ""}`}
                type="text"
                id="buyer-name"
                placeholder="Masukkan nama sesuai KTP"
                autoComplete="name"
                aria-required="true"
                value={buyerName}
                onChange={(e) => {
                  setBuyerName(e.target.value);
                  setNameError(false);
                }}
              />
              <div className="error-msg" id="err-name" style={{ display: nameError ? "block" : "none" }}>
                Nama lengkap wajib diisi
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="buyer-email">
                Alamat Email
              </label>
              <input
                className={`form-input${emailError ? " error" : ""}`}
                type="email"
                id="buyer-email"
                placeholder="tiket@email.com"
                autoComplete="email"
                aria-required="true"
                value={buyerEmail}
                onChange={(e) => {
                  setBuyerEmail(e.target.value);
                  setEmailError(false);
                }}
              />
              <div className="error-msg" id="err-email" style={{ display: emailError ? "block" : "none" }}>
                Masukkan email yang valid
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="buyer-phone">
                No. WhatsApp
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ position: "relative", width: "110px", flexShrink: 0 }}>
                  <select
                    className="form-input"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    style={{
                      paddingRight: "28px",
                      appearance: "none",
                      cursor: "pointer",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "#e5e7eb",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "block",
                      width: "100%",
                    }}
                    aria-label="Kode Negara"
                  >
                    <option style={{ background: "#111827", color: "#e5e7eb", padding: "8px" }} value="+62">🇮🇩 +62</option>
                    <option style={{ background: "#111827", color: "#e5e7eb", padding: "8px" }} value="+60">🇲🇾 +60</option>
                    <option style={{ background: "#111827", color: "#e5e7eb", padding: "8px" }} value="+65">🇸🇬 +65</option>
                    <option style={{ background: "#111827", color: "#e5e7eb", padding: "8px" }} value="+66">🇹🇭 +66</option>
                    <option style={{ background: "#111827", color: "#e5e7eb", padding: "8px" }} value="+1">🇺🇸 +1</option>
                  </select>
                  <div
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      color: "#9ca3af",
                      fontSize: "12px",
                    }}
                  >
                    ▼
                  </div>
                </div>
                <input
                  className={`form-input${phoneError ? " error" : ""}`}
                  type="tel"
                  id="buyer-phone"
                  placeholder="8xx xxxx xxxx"
                  autoComplete="tel-national"
                  aria-required="true"
                  value={buyerPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    const cleanVal = val.startsWith("0") ? val.substring(1) : val;
                    setBuyerPhone(cleanVal);
                    setPhoneError(false);
                  }}
                  style={{ flex: 1, backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
                />
              </div>
              <div className="error-msg" id="err-phone" style={{ display: phoneError ? "block" : "none" }}>
                Nomor WhatsApp wajib diisi (minimal 8 angka)
              </div>
            </div>
            <div
              className="modal-total-detail"
              style={{
                background: "rgba(139, 92, 246, 0.1)",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                marginTop: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontSize: "0.9rem",
                  color: "#d8b4fe",
                }}
              >
                <span>
                  Harga Tiket ({qty}x {formatRupiah(currentPrice)})
                </span>
                <span>{formatRupiah(currentPrice * qty)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  fontSize: "0.9rem",
                  color: "#d8b4fe",
                }}
              >
                <span>Biaya Platform</span>
                <span style={{ color: "#34d399", fontWeight: 500 }}>Gratis</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px dashed rgba(139, 92, 246, 0.3)",
                  paddingTop: "12px",
                  fontWeight: "bold",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#fff", fontSize: "0.95rem" }}>
                  Total Pembayaran
                </span>
                <span
                  style={{
                    color: "#fff",
                    fontSize: "1.3rem",
                    textShadow: "0 0 10px rgba(139, 92, 246, 0.5)",
                  }}
                  id="modal-total"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {formatRupiah(currentPrice * qty)}
                </span>
              </div>
              {qty === 2 && (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "0.8rem",
                    color: "#fca5a5",
                    textAlign: "center",
                    backgroundColor: "rgba(220, 38, 38, 0.2)",
                    padding: "6px",
                    borderRadius: "6px",
                  }}
                >
                  ⚠️ Maksimal pembelian dibatasi 2 tiket per transaksi
                </div>
              )}
            </div>
            <button
              className="checkout-btn"
              id="checkout-btn"
              onClick={handleCheckout}
              disabled={checkoutDisabled}
              style={checkoutStyle}
              aria-label="Lanjutkan ke proses pembayaran Midtrans"
            >
              {checkoutText}
            </button>
            <div className="secure-note" aria-label="Informasi keamanan">
              🔒{" "}
              <span>
                Pembayaran aman melalui <strong>Midtrans</strong> · Terenkripsi
                SSL 256-bit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div
        className={`toast${toastVisible ? " show" : ""}`}
        id="toast"
        role="alert"
        aria-live="assertive"
      >
        <span className="toast-icon" id="toast-icon" aria-hidden="true">
          {toastData.icon}
        </span>
        <div className="toast-text">
          <strong id="toast-title">{toastData.title}</strong>
          <span id="toast-msg">{toastData.msg}</span>
        </div>
      </div>
    </>
  );
}
