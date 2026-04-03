import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konser Bandung Raya 2026 — Tiket Resmi",
  description:
    "Beli tiket resmi Konser Bandung Raya 2026. Lapangan Gasibu, 17 Agustus 2026. Featuring Hindia, Yura Yunita, Bernadya, .Feast, Iwan Fals, Virgoun, Tulus, Dewa 19, Idgitaf.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
