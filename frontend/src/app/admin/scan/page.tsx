"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { clearCache, getCurrentUser, logoutJwt } from "@/lib/auth";
import { getAdminTicketScan, validateTicket } from "@/lib/api";
import type { AdminTicketScanResult, User } from "@/types";

const navItems = [
  { href: "/admin", label: "Dashboard", active: false },
  { href: "/admin/concerts", label: "Konser", active: false },
  { href: "/admin/transactions", label: "Transaksi", active: false },
  { href: "/admin/users", label: "Pengguna", active: false },
  { href: "/admin/scan", label: "Scan Tiket", active: true },
];

function parseTicketCode(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/CONCERTIX-VERIFY:([a-zA-Z0-9-]+)/i);
  if (match?.[1]) return match[1];
  return trimmed;
}

function statusStyle(status: string) {
  if (status === "paid") {
    return { background: "rgba(16,185,129,0.12)", color: "#34d399" };
  }
  if (status === "used") {
    return { background: "rgba(107,114,128,0.16)", color: "#d1d5db" };
  }
  if (status === "pending") {
    return { background: "rgba(245,158,11,0.12)", color: "#fbbf24" };
  }
  return { background: "rgba(239,68,68,0.12)", color: "#f87171" };
}

export default function AdminScanTicketPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [result, setResult] = useState<AdminTicketScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

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

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const loadTicket = useCallback(async (ticketId: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await getAdminTicketScan(ticketId);
      setResult(data);
      setScanInput(ticketId);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Gagal memuat data tiket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scannerActive || !streamRef.current || !videoRef.current) return;

    let cancelled = false;
    const video = videoRef.current;
    video.srcObject = streamRef.current;

    async function runScanner() {
      try {
        await video.play();
        setCameraReady(true);

        const scanFrame = async () => {
          if (cancelled || !videoRef.current || !canvasRef.current) return;
          try {
            const currentVideo = videoRef.current;
            const canvas = canvasRef.current;
            const width = currentVideo.videoWidth;
            const height = currentVideo.videoHeight;

            if (width > 0 && height > 0 && currentVideo.readyState >= currentVideo.HAVE_CURRENT_DATA) {
              canvas.width = width;
              canvas.height = height;
              const context = canvas.getContext("2d", { willReadFrequently: true });
              context?.drawImage(currentVideo, 0, 0, width, height);
              const imageData = context?.getImageData(0, 0, width, height);
              const code = imageData ? jsQR(imageData.data, width, height) : null;

              if (!code?.data) {
                scanTimerRef.current = window.setTimeout(scanFrame, 250);
                return;
              }

              const ticketId = parseTicketCode(code.data);
              stopCamera();
              await loadTicket(ticketId);
              return;
            }
          } catch {
            // Some browsers throw while the video frame is not ready yet.
          }
          scanTimerRef.current = window.setTimeout(scanFrame, 350);
        };

        scanFrame();
      } catch {
        setScannerError("Kamera tidak bisa dibuka. Coba input kode tiket manual.");
        stopCamera();
      }
    }

    runScanner();
    return () => {
      cancelled = true;
      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [loadTicket, scannerActive, stopCamera]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutJwt();
    } catch {
      clearCache();
    }
    router.replace("/login");
  };

  const handleLookup = async (event?: FormEvent) => {
    event?.preventDefault();
    const ticketId = parseTicketCode(scanInput);
    if (!ticketId) {
      setError("Masukkan Ticket ID atau isi QR e-ticket.");
      return;
    }
    await loadTicket(ticketId);
  };

  const startCamera = async () => {
    setScannerError(null);
    setError(null);

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setScannerError("Kamera hanya bisa dibuka dari HTTPS atau localhost.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Akses kamera tidak tersedia di browser ini.");
      return;
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setScannerActive(true);
    } catch {
      setScannerError("Izin kamera ditolak atau kamera tidak tersedia.");
    }
  };

  const handleValidate = async () => {
    if (!result?.can_validate) return;
    const ok = window.confirm("Tandai tiket ini sebagai sudah terpakai?");
    if (!ok) return;

    setValidating(true);
    setError(null);
    setMessage(null);
    try {
      await validateTicket(result.id);
      await loadTicket(result.id);
      setMessage("Tiket berhasil diverifikasi dan statusnya menjadi used.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memverifikasi tiket.");
    } finally {
      setValidating(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
            {navItems.map((item) => (
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

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Scan Tiket</h1>
          <p style={{ color: "#9ca3af", marginTop: 6, fontSize: 15 }}>Cek e-ticket yang sudah lunas, lalu verifikasi saat pengunjung masuk.</p>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 14 }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ marginBottom: 20, padding: 16, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, color: "#86efac", fontSize: 14 }}>
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: 24, alignItems: "start" }} className="scan-grid">
          <section style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 18px" }}>Input Scan</h2>
            <form onSubmit={handleLookup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ color: "#d1d5db", fontSize: 13, fontWeight: 600 }}>
                Ticket ID / QR
                <textarea
                  value={scanInput}
                  onChange={(event) => setScanInput(event.target.value)}
                  placeholder="CONCERTIX-VERIFY:ticket-id"
                  rows={4}
                  style={{ width: "100%", marginTop: 8, padding: 14, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", outline: "none", resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
                />
              </label>
              <button type="submit" disabled={loading} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "#fff", fontWeight: 800, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Mengecek..." : "Cek Tiket"}
              </button>
            </form>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {!scannerActive ? (
                <button onClick={startCamera} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  Mulai Kamera
                </button>
              ) : (
                <button onClick={stopCamera} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.1)", color: "#fca5a5", fontWeight: 700, cursor: "pointer" }}>
                  Stop Kamera
                </button>
              )}
            </div>

            {scannerError && (
              <p style={{ margin: "12px 0 0", color: "#fbbf24", fontSize: 13 }}>{scannerError}</p>
            )}

            {scannerActive && (
              <div style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#050510", aspectRatio: "4 / 3", position: "relative" }}>
                <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {!cameraReady && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                    Membuka kamera...
                  </div>
                )}
              </div>
            )}
          </section>

          <section style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", minHeight: 420 }}>
            {!result ? (
              <div style={{ padding: 40, minHeight: 420, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                <p style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Belum ada tiket dicek</p>
                <p style={{ color: "#9ca3af", margin: 0, maxWidth: 420 }}>Masukkan isi QR atau Ticket ID dari e-ticket pembeli untuk melihat data verifikasi.</p>
              </div>
            ) : (
              <div>
                <div style={{ padding: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 8px", fontFamily: "monospace" }}>#{result.id}</p>
                    <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>{result.concert.name}</h2>
                    <p style={{ color: "#d1d5db", margin: 0 }}>{result.concert.artist}</p>
                  </div>
                  <span style={{ ...statusStyle(result.status), padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
                    {result.status}
                  </span>
                </div>

                <div style={{ padding: 24 }}>
                  <div style={{ padding: 16, borderRadius: 12, background: result.can_validate ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)", border: result.can_validate ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(245,158,11,0.2)", color: result.can_validate ? "#86efac" : "#fde68a", marginBottom: 22, fontSize: 14, fontWeight: 600 }}>
                    {result.validation_message}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }} className="detail-grid">
                    <div>
                      <h3 style={{ color: "#9ca3af", fontSize: 12, textTransform: "uppercase", margin: "0 0 10px", letterSpacing: "0.5px" }}>Pembeli</h3>
                      <p style={{ margin: "0 0 4px", fontWeight: 800 }}>{result.buyer.full_name || "-"}</p>
                      <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>{result.buyer.email || "-"}</p>
                    </div>
                    <div>
                      <h3 style={{ color: "#9ca3af", fontSize: 12, textTransform: "uppercase", margin: "0 0 10px", letterSpacing: "0.5px" }}>Konser</h3>
                      <p style={{ margin: "0 0 4px", fontWeight: 800 }}>{formatDate(result.concert.date)} - {result.concert.time || "TBA"}</p>
                      <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>{result.concert.venue}</p>
                    </div>
                    <div>
                      <h3 style={{ color: "#9ca3af", fontSize: 12, textTransform: "uppercase", margin: "0 0 10px", letterSpacing: "0.5px" }}>Harga</h3>
                      <p style={{ margin: 0, fontWeight: 800, color: "#c084fc" }}>{formatCurrency(result.concert.price)}</p>
                    </div>
                    <div>
                      <h3 style={{ color: "#9ca3af", fontSize: 12, textTransform: "uppercase", margin: "0 0 10px", letterSpacing: "0.5px" }}>Blockchain</h3>
                      <p style={{ margin: "0 0 4px", fontWeight: 800 }}>{result.blockchain_records} record</p>
                      <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>{result.blockchain_used ? "Sudah ada USED block" : result.blockchain_verified ? "ISSUED tercatat" : "Belum tercatat"}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                    <button
                      onClick={handleValidate}
                      disabled={!result.can_validate || validating}
                      style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: result.can_validate ? "linear-gradient(135deg, #10b981, #22c55e)" : "rgba(255,255,255,0.08)", color: result.can_validate ? "#04130c" : "#9ca3af", fontWeight: 900, cursor: result.can_validate && !validating ? "pointer" : "not-allowed", opacity: validating ? 0.7 : 1 }}
                    >
                      {validating ? "Memverifikasi..." : "Verifikasi Masuk"}
                    </button>
                  </div>

                  {result.blocks.length > 0 && (
                    <div style={{ marginTop: 28, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 12px" }}>Riwayat Blockchain</h3>
                      <div style={{ display: "grid", gap: 10 }}>
                        {result.blocks.map((block) => (
                          <div key={`${block.index}-${block.hash}`} style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                            <div>
                              <p style={{ margin: "0 0 4px", fontWeight: 800 }}>{block.action} block #{block.index}</p>
                              <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>{block.timestamp ? new Date(block.timestamp).toLocaleString("id-ID") : "-"}</p>
                            </div>
                            <code style={{ color: "#9ca3af", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{block.hash}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea:focus {
          border-color: #a78bfa !important;
          background: rgba(255,255,255,0.05) !important;
        }
        @media (max-width: 920px) {
          .scan-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
