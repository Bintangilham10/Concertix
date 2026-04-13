"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithSupabase, getSupabaseUser, cacheUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      // Login via Supabase Auth
      await loginWithSupabase(email, password);

      // Get user info (includes role from app_metadata)
      const user = await getSupabaseUser();

      if (user) {
        cacheUser(user);

        // Redirect based on role
        if (user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login gagal.";
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
          <h1 className="auth-title">Selamat datang kembali di Concertix</h1>
          <p className="auth-copy">
            Masuk untuk akses tiket resmi, dashboard transaksi, dan verifikasi
            blockchain. Nikmati pengalaman konser yang aman dan eksklusif dari
            layar Anda.
          </p>
          <div className="auth-highlights">
            <div>
              <p className="auth-highlight-label">Tiket resmi</p>
              <p className="auth-highlight-value">
                Pembelian cepat &amp; terverifikasi
              </p>
            </div>
            <div>
              <p className="auth-highlight-label">Blockchain</p>
              <p className="auth-highlight-value">
                Riwayat transaksi transparan
              </p>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Auth tabs">
            <Link
              href="/login"
              className="auth-tab active"
              aria-selected="true"
              role="tab"
            >
              Masuk
            </Link>
            <Link href="/register" className="auth-tab" role="tab">
              Daftar
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
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
              <div className="field-row">
                <label htmlFor="password">Kata Sandi</label>
                <Link href="/forgot-password" className="field-link">
                  Lupa kata sandi?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="auth-input"
              />
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? "Memproses..." : "Masuk ke Akun"}
            </button>

            <p className="auth-note">
              Masuk langsung menggunakan akun Google atau Apple dalam satu
              langkah.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
