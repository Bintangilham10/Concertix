"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Secara teknis kita butuh token dari parameter URL (misal: '?token=abc123xyz')
  // Tapi untuk saat ini kita fokus di UI-nya saja.

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!password || !confirmPassword) {
      setError("Semua kolom kata sandi wajib diisi.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Kata sandi dan konfirmasi tidak cocok!");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal berisi 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      // TODO: Panggil API nyata ke backend dengan membawa 'token' dari URL
      // Contoh: await fetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
      
      // Simulasi delay eksekusi
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setSuccess(true);
      
      // Setelah beberapa detik, arahkan otomatis ke halaman Login
      setTimeout(() => {
        router.push("/login");
      }, 3000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengatur ulang kata sandi.";
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
          <h1 className="auth-title">Pembaruan Sandi</h1>
          <p className="auth-copy">
            Silakan masukkan kata sandi baru Anda. Pastikan kata sandi unik dan mudah Anda ingat, serta hindari penggunaan informasi personal yang mudah ditebak.
          </p>
          <div className="auth-highlights">
            <div>
              <p className="auth-highlight-label">Aman & Terenkripsi</p>
              <p className="auth-highlight-value">
                Kata sandi Anda akan dengan aman disimpan menggunakan metode kriptografi terbaik.
              </p>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Auth tabs">
             <div className="auth-tab active" aria-selected="true" role="tab" style={{ cursor: 'default' }}>
                Reset Kata Sandi
             </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {success ? (
               <div style={{ marginBottom: '1.5rem', padding: '1rem', fontSize: '0.875rem', color: '#6ee7b7', backgroundColor: 'rgba(6, 78, 59, 0.3)', borderRadius: '0.5rem', border: '1px solid #065f46', textAlign: 'center' }}>
                  <strong>Kata sandi berhasil diubah!</strong><br />
                  Anda akan diarahkan ke halaman login dalam beberapa detik...
               </div>
            ) : null}

            <div className="field-group">
              <label htmlFor="password">Kata Sandi Baru</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Buat kata sandi yang kuat"
                className="auth-input"
                disabled={loading || success}
              />
            </div>

            <div className="field-group">
              <label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ketik ulang kata sandi"
                className="auth-input"
                disabled={loading || success}
              />
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            {!success ? (
               <button type="submit" disabled={loading} className="auth-button">
                 {loading ? "Menyimpan Perubahan..." : "Simpan Kata Sandi"}
               </button>
            ) : null}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href="/login" className="field-link" style={{ fontSize: '0.875rem', textDecoration: 'none' }}>
                Batalkan &amp; Kembali ke Login
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
