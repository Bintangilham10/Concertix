"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError("Email wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengirim kode OTP reset kata sandi.";
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
          <p className="eyebrow">KBR 2026 · Keamanan Akun</p>
          <h1 className="auth-title">Lupa Kata Sandi?</h1>
          <p className="auth-copy">
            Jangan khawatir! Masukkan email kamu yang terdaftar di Concertix, dan kami akan mengirimkan kode OTP untuk mengatur ulang kata sandi.
          </p>
          <div className="auth-highlights">
            <div>
              <p className="auth-highlight-label">Aman & Cepat</p>
              <p className="auth-highlight-value">
                Kode OTP dikirimkan langsung ke emailmu.
              </p>
            </div>
            <div>
              <p className="auth-highlight-label">Privasi Terjaga</p>
              <p className="auth-highlight-value">
                Proses pemulihan memakai kode yang memiliki masa berlaku.
              </p>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Auth tabs">
             <div className="auth-tab active" aria-selected="true" role="tab" style={{ cursor: 'default' }}>
                Pemulihan Akun
             </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {success ? (
               <div style={{ marginBottom: '1.5rem', padding: '1rem', fontSize: '0.875rem', color: '#6ee7b7', backgroundColor: 'rgba(6, 78, 59, 0.3)', borderRadius: '0.5rem', border: '1px solid #065f46' }}>
                  Cek kotak masuk email kamu. Kami telah mengirimkan kode OTP untuk mengatur ulang kata sandi. Kode tersebut memiliki batas waktu tertentu sebelum kedaluwarsa.
               </div>
            ) : null}

            <div className="field-group">
              <label htmlFor="email">Email Terdaftar</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                className="auth-input"
                disabled={loading || success}
              />
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            {!success ? (
               <button type="submit" disabled={loading} className="auth-button">
                 {loading ? "Mengirim OTP..." : "Kirim Kode OTP"}
               </button>
            ) : null}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              {success ? (
                <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="auth-button" style={{ display: 'block', marginBottom: '1rem', textDecoration: 'none' }}>
                  Masukkan Kode OTP
                </Link>
              ) : null}
              <Link href="/login" className="field-link" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>
                &larr; Kembali ke halaman Masuk
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
