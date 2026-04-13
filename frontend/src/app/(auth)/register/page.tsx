"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { registerWithJwt } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Semua field harus diisi.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const user = await registerWithJwt(email, password, fullName);

      if (user) {
        if (user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } else {
        setError("Akun berhasil dibuat, tetapi data user tidak ditemukan.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Pendaftaran gagal.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-glow" />
      <section className="auth-grid">
        <div className="auth-panel auth-info">
          <p className="eyebrow">KBR 2026 · Konser Bandung Raya</p>
          <h1 className="auth-title">Mulai perjalananmu bersama Concertix</h1>
          <p className="auth-copy">
            Daftar untuk membeli tiket resmi, mengamankan akses backstage, dan
            mendapatkan notifikasi lineup terbaru dalam satu platform.
          </p>
          <div className="auth-highlights">
            <div>
              <p className="auth-highlight-label">Keamanan</p>
              <p className="auth-highlight-value">
                Verifikasi blockchain otomatis
              </p>
            </div>
            <div>
              <p className="auth-highlight-label">Akses eksklusif</p>
              <p className="auth-highlight-value">
                Update langsung dari panitia
              </p>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Auth tabs">
            <Link href="/login" className="auth-tab" role="tab">
              Masuk
            </Link>
            <Link
              href="/register"
              className="auth-tab active"
              aria-selected="true"
              role="tab"
            >
              Daftar
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field-group">
              <label htmlFor="full_name">Nama Lengkap</label>
              <input
                id="full_name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nama lengkap"
                className="auth-input"
              />
            </div>

            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                className="auth-input"
              />
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="auth-input"
              />
            </div>

            <div className="field-group">
              <label htmlFor="confirm_password">Konfirmasi Password</label>
              <input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                className="auth-input"
              />
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? "Memproses..." : "Buat Akun"}
            </button>

            <p className="auth-note">
              Dengan mendaftar, kamu mendapatkan akses penuh ke pembelian tiket,
              jadwal konser, dan notifikasi VIP.
            </p>
          </form>

          <p className="auth-footer">
            Sudah punya akun?{" "}
            <Link href="/login" className="auth-link">
              Masuk di sini
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
