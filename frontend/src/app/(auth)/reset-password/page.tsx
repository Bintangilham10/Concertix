"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !otp || !password || !confirmPassword) {
      setError("Email, OTP, dan kata sandi wajib diisi.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Kode OTP harus berisi 6 digit angka.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Kata sandi dan konfirmasi tidak cocok!");
      return;
    }

    if (password.length < 8) {
      setError("Kata sandi minimal berisi 8 karakter.");
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError("Kata sandi harus mengandung huruf besar, huruf kecil, dan angka.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email, otp, password);
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

            <div className="field-group">
              <label htmlFor="otp">Kode OTP</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="auth-input"
                disabled={loading || success}
              />
            </div>

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
