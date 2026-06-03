"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithJwt } from "@/lib/auth";
import { FORM_LIMITS, isValidEmail, limitLength } from "@/lib/form-constraints";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Format email tidak valid.");
      return;
    }

    if (password.length > FORM_LIMITS.passwordMax) {
      setError(`Kata sandi maksimal ${FORM_LIMITS.passwordMax} karakter.`);
      return;
    }

    setLoading(true);

    try {
      const user = await loginWithJwt(normalizedEmail, password);

      if (user) {
        if (user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/#tickets");
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
            Masuk untuk membeli tiket resmi dan mengelola pesanan Anda.
            Nikmati pengalaman nonton konser dengan mudah, cepat, dan aman.
          </p>

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
                onChange={(event) => setEmail(limitLength(event.target.value, FORM_LIMITS.emailMax))}
                placeholder="nama@domain.com"
                className="auth-input"
                autoComplete="email"
                inputMode="email"
                maxLength={FORM_LIMITS.emailMax}
                required
              />
              <p className="field-hint">Format email aktif, maksimal {FORM_LIMITS.emailMax} karakter.</p>
            </div>

            <div className="field-group">
              <div className="field-row">
                <label htmlFor="password">Kata Sandi</label>
                <Link href="/forgot-password" className="field-link">
                  Lupa kata sandi?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(limitLength(event.target.value, FORM_LIMITS.passwordMax))}
                  placeholder="Kata sandi akun"
                  className="auth-input"
                  style={{ paddingRight: "40px" }}
                  autoComplete="current-password"
                  maxLength={FORM_LIMITS.passwordMax}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <p className="field-hint">Maksimal {FORM_LIMITS.passwordMax} karakter.</p>
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? "Memproses..." : "Masuk ke Akun"}
            </button>

            <p className="auth-note">
              Masuk menggunakan email dan kata sandi yang terdaftar di
              Concertix.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
