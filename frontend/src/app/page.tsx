"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────
interface ToastData {
  icon: string;
  title: string;
  msg: string;
}

// ── Artist data ────────────────────────────────────────────────────
const artists = [
  {
    name: "Hindia",
    initials: "HN",
    genre: "Indie Pop",
    color: "ac-purple",
    badge: "⭐ HEADLINE",
  },
  {
    name: "Yura Yunita",
    initials: "YY",
    genre: "Pop",
    color: "ac-blue",
    badge: "⭐ HEADLINE",
  },
  {
    name: "Bernadya",
    initials: "BD",
    genre: "Indie",
    color: "ac-teal",
    badge: null,
  },
  {
    name: ".Feast",
    initials: ".F",
    genre: "Post-Punk",
    color: "ac-purple",
    badge: null,
  },
  {
    name: "Iwan Fals",
    initials: "IF",
    genre: "Folk",
    color: "ac-amber",
    badge: "⭐ LEGEND",
  },
  {
    name: "Virgoun",
    initials: "VG",
    genre: "Pop",
    color: "ac-blue",
    badge: null,
  },
  {
    name: "Tulus",
    initials: "TL",
    genre: "Jazz/Pop",
    color: "ac-teal",
    badge: "⭐ HEADLINE",
  },
  {
    name: "Dewa 19",
    initials: "D19",
    genre: "Rock",
    color: "ac-amber",
    badge: "⭐ LEGEND",
  },
  {
    name: "Idgitaf",
    initials: "IG",
    genre: "Indie",
    color: "ac-purple",
    badge: null,
  },
];

// ── FAQ data ───────────────────────────────────────────────────────
const faqs = [
  {
    id: "faq1",
    question: "Bagaimana cara membeli tiket?",
    answer:
      "Pilih kategori tiket (VIP atau Regular), isi data diri kamu, lakukan pembayaran melalui Midtrans (transfer bank, kartu kredit, GoPay, OVO, Dana, dll.), dan tiket dalam format QR Code akan dikirim ke email kamu dalam 5 menit setelah pembayaran berhasil.",
  },
  {
    id: "faq2",
    question: "Berapa total tiket yang tersedia?",
    answer:
      "Total tiket yang tersedia adalah 4.000 tiket: 1.000 tiket VIP (Rp 1.250.000) dan 3.000 tiket Regular (Rp 750.000). Semua tiket dijual secara online melalui platform resmi ini saja. Tidak ada penjualan di lokasi (on-site).",
  },
  {
    id: "faq3",
    question: "Apakah tiket bisa di-refund?",
    answer:
      "Tiket tidak dapat di-refund, namun dapat dipindahtangankan ke orang lain. Hubungi tim customer service kami minimal 7 hari sebelum event untuk proses transfer kepemilikan tiket. Pastikan nama penerima sesuai dengan KTP yang akan dibawa saat event.",
  },
  {
    id: "faq4",
    question: "Apa perbedaan tiket VIP dan Regular?",
    answer:
      "Tiket VIP mendapat zona eksklusif di depan panggung, meet & greet dengan artis, merchandise eksklusif, early entry gate, akses VIP Lounge, dan priority parking. Tiket Regular mendapat akses general admission ke seluruh area festival, merchandise, free parking, dan akses food court.",
  },
  {
    id: "faq5",
    question: "Apa yang perlu dibawa saat event?",
    answer:
      "Wajib membawa QR Code tiket (digital di smartphone atau cetak) dan KTP/identitas diri sesuai nama pemesan. Barang yang dilarang masuk: kamera profesional dengan lensa lepasan, drone, senjata tajam, dan minuman beralkohol. Tas akan diperiksa di pintu masuk.",
  },
  {
    id: "faq6",
    question: "Bagaimana jika event dibatalkan atau ditunda?",
    answer:
      "Jika event dibatalkan oleh panitia, seluruh pembeli tiket akan mendapat refund 100% ke metode pembayaran asal dalam 14 hari kerja. Informasi pembatalan/penundaan akan diumumkan melalui email, Instagram resmi, dan website ini.",
  },
];

// ── Utility ────────────────────────────────────────────────────────
function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

// ── Component ──────────────────────────────────────────────────────
export default function Home() {
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("VIP");
  const [modalPriceStr, setModalPriceStr] = useState("Rp 1.250.000");
  const [currentPrice, setCurrentPrice] = useState(1250000);
  const [qty, setQty] = useState(1);

  // Form state
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
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

  // FAQ state
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Name input ref for focus
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Toast handler ──────────────────────────────────────────────
  const showToast = useCallback(
    (icon: string, title: string, msg: string, duration = 3500) => {
      setToastData({ icon, title, msg });
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(
        () => setToastVisible(false),
        duration,
      );
    },
    [],
  );

  // ── Drawer ─────────────────────────────────────────────────────
  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const closeDrawer = () => setDrawerOpen(false);

  // ── Modal ──────────────────────────────────────────────────────
  const openModal = useCallback(
    (type: string, priceStr: string, price: number) => {
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
    },
    [],
  );

  const closeModal = useCallback(() => setModalOpen(false), []);

  // ── Escape key ─────────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
        closeModal();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [closeModal]);

  // ── Quantity ───────────────────────────────────────────────────
  const changeQty = (delta: number) => {
    setQty((prev) => Math.max(1, Math.min(2, prev + delta)));
  };

  // ── Checkout ───────────────────────────────────────────────────
  const handleCheckout = () => {
    const nOk = buyerName.trim().length > 1;
    const eOk = buyerEmail.includes("@") && buyerEmail.includes(".");
    const pOk = buyerPhone.trim().length >= 8;

    setNameError(!nOk);
    setEmailError(!eOk);
    setPhoneError(!pOk);

    if (!nOk || !eOk || !pOk) {
      showToast(
        "⚠️",
        "Periksa Form",
        "Ada data yang belum diisi dengan benar.",
        3000,
      );
      return;
    }

    setCheckoutText("Memproses Pembayaran...");
    setCheckoutDisabled(true);

    setTimeout(() => {
      setCheckoutText("✓ Dialihkan ke Midtrans...");
      setCheckoutStyle({
        background: "linear-gradient(135deg, #10B981, #059669)",
      });
      showToast(
        "🎉",
        "Pembayaran Diproses!",
        "Kamu akan diarahkan ke halaman Midtrans.",
        4000,
      );
      setTimeout(() => {
        closeModal();
        setCheckoutText("Lanjut ke Pembayaran →");
        setCheckoutDisabled(false);
        setCheckoutStyle({});
      }, 2500);
    }, 1600);
  };

  // ── FAQ toggle ─────────────────────────────────────────────────
  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  // ── Smooth scroll helper ───────────────────────────────────────
  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>

      {/* ══════════════ NAVBAR ══════════════ */}
      <nav role="navigation" aria-label="Navigasi utama">
        <div className="nav-inner">
          <a
            href="#home"
            className="nav-logo"
            aria-label="Konser Bandung Raya 2026 — Halaman Utama"
            onClick={(e) => scrollTo(e, "home")}
          >
            KBR 2026
          </a>

          <ul className="nav-links" role="list">
            <li>
              <a href="#home" onClick={(e) => scrollTo(e, "home")}>
                Home
              </a>
            </li>
            <li>
              <a href="#lineup" onClick={(e) => scrollTo(e, "lineup")}>
                Lineup
              </a>
            </li>
            <li>
              <a href="#venue" onClick={(e) => scrollTo(e, "venue")}>
                Venue
              </a>
            </li>
            <li>
              <a href="#faq" onClick={(e) => scrollTo(e, "faq")}>
                FAQ
              </a>
            </li>
          </ul>

          <div className="nav-actions">
            <a href="/login" className="btn-ghost" aria-label="Masuk ke akun">
              Masuk
            </a>
            <a
              href="/register"
              className="btn-primary"
              aria-label="Daftar akun baru"
            >
              Daftar
            </a>
          </div>

          <button
            className="hamburger"
            id="hamburgerBtn"
            aria-label="Buka menu navigasi"
            aria-expanded={drawerOpen}
            aria-controls="navDrawer"
            onClick={toggleDrawer}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div
        className={`nav-drawer${drawerOpen ? " open" : ""}`}
        id="navDrawer"
        role="dialog"
        aria-label="Menu navigasi mobile"
      >
        <a
          href="#home"
          onClick={(e) => {
            scrollTo(e, "home");
            closeDrawer();
          }}
        >
          Home
        </a>
        <a
          href="#lineup"
          onClick={(e) => {
            scrollTo(e, "lineup");
            closeDrawer();
          }}
        >
          Lineup
        </a>
        <a
          href="#venue"
          onClick={(e) => {
            scrollTo(e, "venue");
            closeDrawer();
          }}
        >
          Venue
        </a>
        <a
          href="#faq"
          onClick={(e) => {
            scrollTo(e, "faq");
            closeDrawer();
          }}
        >
          FAQ
        </a>
        <div className="nav-drawer-actions">
          <a href="/login" className="btn-ghost" onClick={closeDrawer}>
            Masuk
          </a>
          <a href="/register" className="btn-primary" onClick={closeDrawer}>
            Daftar
          </a>
        </div>
      </div>

      <main id="main-content">
        {/* ══════════════ HERO SECTION ══════════════ */}
        <section className="hero" id="home" aria-labelledby="hero-title">
          <div className="hero-bg" aria-hidden="true">
            <div className="hero-bg-base"></div>
            <div className="beams">
              <div className="beam"></div>
              <div className="beam"></div>
              <div className="beam"></div>
              <div className="beam"></div>
              <div className="beam"></div>
              <div className="beam"></div>
            </div>
            <div className="crowd-wrap">
              <svg
                viewBox="0 0 1440 220"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="crowdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#160032" stopOpacity={0.88} />
                    <stop offset="100%" stopColor="#0F0F1A" />
                  </linearGradient>
                </defs>
                <g fill="#1A0040" opacity={0.78}>
                  <ellipse cx="50" cy="220" rx="22" ry="58" />
                  <ellipse cx="100" cy="212" rx="19" ry="50" />
                  <ellipse cx="148" cy="220" rx="24" ry="62" />
                  <ellipse cx="196" cy="208" rx="18" ry="48" />
                  <ellipse cx="244" cy="220" rx="23" ry="60" />
                  <ellipse cx="292" cy="210" rx="20" ry="52" />
                  <ellipse cx="340" cy="220" rx="25" ry="64" />
                  <ellipse cx="390" cy="206" rx="18" ry="46" />
                  <ellipse cx="438" cy="220" rx="22" ry="60" />
                  <ellipse cx="486" cy="212" rx="21" ry="54" />
                  <ellipse cx="534" cy="220" rx="26" ry="66" />
                  <ellipse cx="582" cy="208" rx="19" ry="50" />
                  <ellipse cx="630" cy="220" rx="23" ry="60" />
                  <ellipse cx="678" cy="210" rx="22" ry="56" />
                  <ellipse cx="726" cy="220" rx="25" ry="64" />
                  <ellipse cx="774" cy="206" rx="18" ry="48" />
                  <ellipse cx="822" cy="220" rx="22" ry="60" />
                  <ellipse cx="870" cy="214" rx="20" ry="52" />
                  <ellipse cx="918" cy="220" rx="26" ry="65" />
                  <ellipse cx="966" cy="208" rx="19" ry="50" />
                  <ellipse cx="1014" cy="220" rx="23" ry="60" />
                  <ellipse cx="1062" cy="210" rx="22" ry="56" />
                  <ellipse cx="1110" cy="220" rx="25" ry="64" />
                  <ellipse cx="1158" cy="206" rx="18" ry="48" />
                  <ellipse cx="1206" cy="220" rx="22" ry="60" />
                  <ellipse cx="1254" cy="212" rx="21" ry="54" />
                  <ellipse cx="1302" cy="220" rx="26" ry="65" />
                  <ellipse cx="1350" cy="208" rx="19" ry="50" />
                  <ellipse cx="1398" cy="220" rx="23" ry="60" />
                  <ellipse cx="1440" cy="210" rx="20" ry="52" />
                  <rect x="62" y="154" width="4" height="28" rx="2" />
                  <rect
                    x="57"
                    y="162"
                    width="4"
                    height="18"
                    rx="2"
                    transform="rotate(-16 57 162)"
                  />
                  <rect x="210" y="148" width="4" height="30" rx="2" />
                  <rect
                    x="205"
                    y="156"
                    width="4"
                    height="20"
                    rx="2"
                    transform="rotate(12 205 156)"
                  />
                  <rect x="408" y="144" width="4" height="32" rx="2" />
                  <rect
                    x="403"
                    y="154"
                    width="4"
                    height="18"
                    rx="2"
                    transform="rotate(-20 403 154)"
                  />
                  <rect x="598" y="150" width="4" height="28" rx="2" />
                  <rect x="742" y="142" width="4" height="34" rx="2" />
                  <rect
                    x="737"
                    y="152"
                    width="4"
                    height="22"
                    rx="2"
                    transform="rotate(-14 737 152)"
                  />
                  <rect x="886" y="148" width="4" height="30" rx="2" />
                  <rect
                    x="881"
                    y="156"
                    width="4"
                    height="18"
                    rx="2"
                    transform="rotate(8 881 156)"
                  />
                  <rect x="1074" y="144" width="4" height="32" rx="2" />
                  <rect x="1270" y="146" width="4" height="30" rx="2" />
                  <rect x="1420" y="148" width="4" height="28" rx="2" />
                </g>
                <rect
                  x="0"
                  y="0"
                  width="1440"
                  height="220"
                  fill="url(#crowdGrad)"
                />
              </svg>
            </div>
          </div>

          <div className="hero-content">
            <div className="hero-tag" role="note">
              <span className="hero-dot" aria-hidden="true"></span>
              Live Concert · 2026
            </div>

            <h1 className="hero-title" id="hero-title">
              <span className="gradient-text">KONSER</span>
              <br />
              BANDUNG
              <br />
              <span className="gradient-text">RAYA</span>
            </h1>

            <p className="hero-subtitle">📍 Lapangan Gasibu, Kota Bandung</p>
            <p className="hero-date">
              <strong>17 Agustus 2026, Senin, 19:00 WIB</strong>
            </p>

            <div className="hero-actions">
              <div
                className="cap-card"
                role="group"
                aria-label="Rincian kapasitas tiket"
              >
                <div className="cap-label">Total Tiket Tersedia</div>
                <div className="cap-number" aria-label="4.000 penonton">
                  4.000 Penonton
                </div>
                <div className="cap-breakdown">
                  <div className="cap-item">
                    <span className="cap-dot vip" aria-hidden="true"></span>
                    <span className="cap-item-label">VIP</span>
                    <span className="cap-item-val">1.000 tiket</span>
                  </div>
                  <div className="cap-sep" aria-hidden="true"></div>
                  <div className="cap-item">
                    <span className="cap-dot reg" aria-hidden="true"></span>
                    <span className="cap-item-label">Regular</span>
                    <span className="cap-item-val">3.000 tiket</span>
                  </div>
                </div>
              </div>

              <a
                href="#tickets"
                className="hero-cta"
                aria-label="Pergi ke bagian Pilih Tiket"
              >
                Beli Tiket Sekarang
                <span className="cta-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </div>

            <div
              className="trust-row"
              role="list"
              aria-label="Badge kepercayaan"
            >
              <div className="trust-badge" role="listitem">
                ✅ Tiket Resmi
              </div>
              <div className="trust-badge" role="listitem">
                📱 QR Code Entry
              </div>
              <div className="trust-badge" role="listitem">
                💳 Powered by Midtrans
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ ARTIST LINEUP SECTION ══════════════ */}
        <section
          id="lineup"
          className="lineup-section"
          aria-labelledby="lineup-title"
        >
          <div className="section-wrapper">
            <div className="lineup-header">
              <div className="section-label">Artis Tamu</div>
              <h2 className="section-title" id="lineup-title">
                ARTIST LINEUP
              </h2>
              <p className="section-sub">9 Artis Luar Biasa dari Indonesia</p>
            </div>

            <div
              className="artists-grid"
              role="list"
              aria-label="Daftar artis yang tampil"
            >
              {artists.map((artist) => (
                <article
                  key={artist.name}
                  className={`artist-card ${artist.color}`}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${artist.name}, genre ${artist.genre}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      showToast("🎵", artist.name, `Genre: ${artist.genre}`);
                    }
                  }}
                >
                  <div className="artist-glow" aria-hidden="true"></div>
                  <div className="artist-shine" aria-hidden="true"></div>
                  {artist.badge && (
                    <div className="artist-badge">{artist.badge}</div>
                  )}
                  <div className="artist-avatar" aria-hidden="true">
                    {artist.initials}
                  </div>
                  <div className="artist-name">{artist.name}</div>
                  <div className="artist-genre">{artist.genre}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ TICKET SECTION ══════════════ */}
        <section
          id="tickets"
          className="ticket-section"
          aria-labelledby="ticket-title"
        >
          <div className="section-wrapper">
            <div className="ticket-header">
              <div className="section-label">Pilih Tiket</div>
              <h2 className="section-title" id="ticket-title">
                PILIH TIKET ANDA
              </h2>
              <p className="section-sub">
                Total 4.000 tiket tersedia — segera amankan milikmu!
              </p>
            </div>

            <div className="tickets-grid" role="list">
              {/* VIP TICKET */}
              <article
                className="ticket-card tc-vip"
                role="listitem"
                tabIndex={0}
                aria-label="Tiket VIP, harga Rp 1.250.000, 1.000 tiket tersedia"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openModal("VIP", "Rp 1.250.000", 1250000);
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
                    Rp 1.250.000<sub>/tiket</sub>
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
                    onClick={() => openModal("VIP", "Rp 1.250.000", 1250000)}
                    aria-label="Beli tiket VIP seharga Rp 1.250.000"
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
                aria-label="Tiket Regular, harga Rp 750.000, 3.000 tiket tersedia"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openModal("Regular", "Rp 750.000", 750000);
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
                    Rp 750.000<sub>/tiket</sub>
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
                    onClick={() => openModal("Regular", "Rp 750.000", 750000)}
                    aria-label="Beli tiket Regular seharga Rp 750.000"
                  >
                    Beli Tiket Regular →
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ══════════════ VENUE SECTION ══════════════ */}
        <section
          id="venue"
          className="venue-section"
          aria-labelledby="venue-title"
        >
          <div className="venue-inner">
            <div
              className="venue-map"
              role="img"
              aria-label="Peta lokasi Lapangan Gasibu, Bandung"
            >
              <iframe
                src="https://maps.google.com/maps?q=-6.9019,107.6183&z=16&output=embed"
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  filter:
                    "invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%)",
                }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Peta Lapangan Gasibu"
              ></iframe>
            </div>
            <div className="venue-info">
              <div className="section-label">Lokasi Event</div>
              <h2 id="venue-title">
                LAPANGAN
                <br />
                GASIBU
              </h2>
              <ul
                className="venue-list"
                role="list"
                aria-label="Informasi venue"
              >
                <li className="venue-item" role="listitem">
                  <div className="venue-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 20, height: 20, color: "#FFFFFF" }}
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <strong>Info Lokasi</strong>
                    <span>Lapangan Gasibu, Kota Bandung, Jawa Barat</span>
                  </div>
                </li>
                <li className="venue-item" role="listitem">
                  <div className="venue-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 20, height: 20, color: "#FFFFFF" }}
                    >
                      <path d="M21.5 12H21a2 2 0 0 0 0-4h.5V5a2 2 0 0 0-2-2H4.5a2 2 0 0 0-2 2v3h.5a2 2 0 0 0 0 4h-.5v3a2 2 0 0 0 2 2H20a2 2 0 0 0 2-2v-3z" />
                      <path d="M8 8V8.01" />
                      <path d="M8 12V12.01" />
                      <path d="M8 16V16.01" />
                    </svg>
                  </div>
                  <div>
                    <strong>Kapasitas Terbatas</strong>
                    <span>
                      4.000 Tiket Resmi (Termasuk Akses VIP &amp; Festival)
                    </span>
                  </div>
                </li>
                <li className="venue-item" role="listitem">
                  <div className="venue-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 20, height: 20, color: "#FFFFFF" }}
                    >
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <circle cx="17" cy="17" r="2" />
                      <path d="M14 17h1" />
                    </svg>
                  </div>
                  <div>
                    <strong>Fasilitas Parkir</strong>
                    <span>
                      Tersedia area parkir terpadu yang aman &amp; memadai
                    </span>
                  </div>
                </li>
                <li className="venue-item" role="listitem">
                  <div className="venue-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 20, height: 20, color: "#FFFFFF" }}
                    >
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8H8m4-4v0M4 10h16M4 6h16M6 6v4m12-4v4" />
                    </svg>
                  </div>
                  <div>
                    <strong>Akses Transportasi</strong>
                    <span>Sangat terjangkau via halte Trans Metro Bandung</span>
                  </div>
                </li>
                <li className="venue-item" role="listitem">
                  <div className="venue-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 20, height: 20, color: "#FFFFFF" }}
                    >
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                      <path d="M7 2v20" />
                      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                    </svg>
                  </div>
                  <div>
                    <strong>F&amp;B Area</strong>
                    <span>Dilengkapi area kuliner dengan beragam pilihan</span>
                  </div>
                </li>
              </ul>
              <a
                href="#tickets"
                className="btn-primary"
                style={{
                  padding: "16px 36px",
                  fontSize: "15px",
                  borderRadius: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  boxShadow: "0 8px 24px rgba(123,44,191,0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Pergi ke bagian Pilih Tiket"
              >
                Amankan Tiket Sekarang →
              </a>
            </div>
          </div>
        </section>

        {/* ══════════════ FAQ SECTION ══════════════ */}
        <section id="faq" className="faq-section" aria-labelledby="faq-title">
          <div className="faq-inner">
            <div className="faq-header">
              <div className="section-label">Pertanyaan Umum</div>
              <h2
                className="section-title"
                id="faq-title"
                style={{ textAlign: "center" }}
              >
                FAQ
              </h2>
            </div>

            {faqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`faq-item${isOpen ? " open" : ""}`}
                  id={faq.id}
                >
                  <button
                    className="faq-question"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`${faq.id}-answer`}
                  >
                    {faq.question}
                    <span className="faq-chevron" aria-hidden="true">
                      ⌄
                    </span>
                  </button>
                  <div
                    className={`faq-answer${isOpen ? " open" : ""}`}
                    id={`${faq.id}-answer`}
                    role="region"
                  >
                    <p>{faq.answer}</p>
                  </div>
                </div>
              );
            })}

            <div style={{ textAlign: "center", marginTop: "36px" }}>
              <a
                href="https://wa.me/6282244356217?text=Halo%20CS%20Concertix%2C%20saya%20butuh%20bantuan."
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{
                  padding: "12px 28px",
                  fontSize: "14px",
                  borderRadius: "10px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Hubungi customer service melalui WhatsApp"
              >
                Butuh Bantuan? Chat CS →
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer role="contentinfo">
        <span className="footer-logo" aria-label="Konser Bandung Raya 2026">
          KONSER BANDUNG RAYA 2026
        </span>
        <p className="footer-tagline">
          Event resmi yang diselenggarakan oleh Bandung Raya Entertainment.
          <br />
          Total 4.000 tiket tersedia · VIP 1.000 + Regular 3.000
          <br />
          Tiket hanya dijual melalui platform resmi ini.
        </p>
        <div
          className="payment-badges"
          role="list"
          aria-label="Metode pembayaran yang diterima"
        >
          <div className="pay-badge" role="listitem">
            QRIS
          </div>
        </div>
        <p className="footer-copy">
          © 2026 Konser Bandung Raya. All rights reserved.
        </p>
      </footer>

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
                <em>Lapangan Gasibu · 17 Agustus 2026</em>
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
              <div className="error-msg" id="err-name">
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
              <div className="error-msg" id="err-email">
                Masukkan email yang valid
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="buyer-phone">
                No. WhatsApp
              </label>
              <input
                className={`form-input${phoneError ? " error" : ""}`}
                type="tel"
                id="buyer-phone"
                placeholder="+62 8xx xxxx xxxx"
                autoComplete="tel"
                aria-required="true"
                value={buyerPhone}
                onChange={(e) => {
                  setBuyerPhone(e.target.value);
                  setPhoneError(false);
                }}
              />
              <div className="error-msg" id="err-phone">
                Nomor WhatsApp wajib diisi
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
