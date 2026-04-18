"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutJwt, getCurrentUser, clearCache } from "@/lib/auth";
import type { User } from "@/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        // Redirect to login if unauthenticated
        if (!currentUser) {
          router.replace("/login");
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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutJwt();
    } catch {
      clearCache();
    }
    router.replace("/login");
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
      {/* ── Customer Header ── */}
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
            <span style={{ padding: "2px 10px", background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontSize: 11, fontWeight: 600, borderRadius: 100, border: "1px solid rgba(59,130,246,0.3)" }}>
              Pelanggan
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            {[
              { href: "/dashboard", label: "Beli Tiket" },
              { href: "/dashboard/my-tickets", label: "Tiket Saya" },
            ].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} style={{
                  fontSize: 14, fontWeight: isActive ? 600 : 500, textDecoration: "none",
                  color: isActive ? "#fff" : "#9ca3af",
                  borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                  paddingBottom: 4, transition: "color 0.2s"
                }}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {user && (
              <div style={{ textAlign: "right", display: "none" }} className="md:block">
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

      {/* ── Content ── */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
        {children}
      </main>

      {/* Basic responsive layout tweak for header using Tailwind classes already configured */}
      <style>{`
        @media (min-width: 768px) {
           .md\\:flex { display: flex !important; }
           .md\\:block { display: block !important; }
        }
        .hidden { display: none; }
      `}</style>
    </div>
  );
}
