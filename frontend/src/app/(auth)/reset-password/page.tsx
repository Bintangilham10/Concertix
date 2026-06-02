"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/lib/api";
import { FORM_LIMITS, cleanDigits, limitLength } from "@/lib/form-constraints";

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

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !otp || !password || !confirmPassword) {
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

    if (password.length < FORM_LIMITS.passwordMin) {
      setError(`Kata sandi minimal berisi ${FORM_LIMITS.passwordMin} karakter.`);
      return;
    }

    if (password.length > FORM_LIMITS.passwordMax) {
      setError(`Kata sandi maksimal ${FORM_LIMITS.passwordMax} karakter.`);
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError("Kata sandi harus mengandung huruf besar, huruf kecil, dan angka.");
      return;
    }

    setEmail(normalizedEmail);
    setLoading(true);

    try {
      await resetPassword(normalizedEmail, otp, password);
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
                onChange={(event) => setEmail(limitLength(event.target.value, FORM_LIMITS.emailMax))}
                placeholder="nama@domain.com"
                className="auth-input"
                autoComplete="email"
                inputMode="email"
                maxLength={FORM_LIMITS.emailMax}
                required
                disabled={loading || success}
              />
              <p className="field-hint">Email yang menerima OTP, maksimal {FORM_LIMITS.emailMax} karakter.</p>
            </div>

            <div className="field-group">
              <label htmlFor="otp">Kode OTP</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={FORM_LIMITS.otpLength}
                value={otp}
                onChange={(event) => setOtp(cleanDigits(event.target.value, FORM_LIMITS.otpLength))}
                placeholder="123456"
                className="auth-input"
                required
                disabled={loading || success}
              />
              <p className="field-hint">Kode OTP harus tepat {FORM_LIMITS.otpLength} digit angka.</p>
            </div>

            <div className="field-group">
              <label htmlFor="password">Kata Sandi Baru</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(limitLength(event.target.value, FORM_LIMITS.passwordMax))}
                placeholder="Minimal 8 karakter"
                className="auth-input"
                autoComplete="new-password"
                minLength={FORM_LIMITS.passwordMin}
                maxLength={FORM_LIMITS.passwordMax}
                required
                disabled={loading || success}
              />
              <p className="field-hint">{FORM_LIMITS.passwordMin}-{FORM_LIMITS.passwordMax} karakter, wajib ada huruf besar, huruf kecil, dan angka.</p>
            </div>

            <div className="field-group">
              <label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(limitLength(event.target.value, FORM_LIMITS.passwordMax))}
                placeholder="Ketik ulang kata sandi"
                className="auth-input"
                autoComplete="new-password"
                minLength={FORM_LIMITS.passwordMin}
                maxLength={FORM_LIMITS.passwordMax}
                required
                disabled={loading || success}
              />
              <p className="field-hint">Harus sama dengan kata sandi baru.</p>
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
