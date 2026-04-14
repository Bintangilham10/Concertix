"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

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
      // TODO: Implementasi pemanggilan API aktual ke backend untuk kirim email berisi token reset.
      // Contoh: await fetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
      
      // Simulasi delay jaringan/pengiriman email
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setSuccess(true);
      setEmail(""); // Kosongkan input setelah sukses
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengirim link reset kata sandi.";
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
            Jangan khawatir! Masukkan email kamu yang terdaftar di Concertix, dan kami akan mengirimkan tautan khusus untuk mengatur ulang kata sandi.
          </p>
          <div className="auth-highlights">
            <div>
              <p className="auth-highlight-label">Aman & Cepat</p>
              <p className="auth-highlight-value">
                Tautan unik dikirimkan langsung ke emailmu.
              </p>
            </div>
            <div>
              <p className="auth-highlight-label">Privasi Terjaga</p>
              <p className="auth-highlight-value">
                Proses pemulihan dengan token yang memiliki masa berlaku.
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
                  Cek kotak masuk email kamu. Kami telah mengirimkan tautan untuk mengatur ulang kata sandi. Tautan tersebut memiliki batas waktu tertentu sebelum kedaluwarsa.
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
                 {loading ? "Mengirim Tautan..." : "Kirim Tautan Reset"}
               </button>
            ) : null}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
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
