import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { API_URL } from "@/lib/api";
import { CartProvider } from '@/providers/CartProvider';
import { CartUiProvider } from '@/providers/CartUiProvider';
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gil Imports — Produtos importados",
    template: "%s | Gil Imports",
  },
  description:
    "Acessórios para celular, fones, caixas de som, smartwatches, garrafas térmicas e perfumes árabes importados.",
  keywords: ["produtos importados", "acessórios para celular", "perfumes árabes", "smartwatch", "garrafas térmicas"],
  icons: {
    icon: "/branding/logo.jpg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Gil Imports",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // API_URL importado apenas para garantir leitura do env em build (evita tree-shaking de config)
  void API_URL;

  return (
        <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* CartProvider: estado de dados (GET/POST/PATCH/DELETE /cart)
            CartUiProvider: estado de UI da gaveta (aberto/fechado) */}
        <CartProvider>
          <CartUiProvider>{children}</CartUiProvider>
        </CartProvider>
      </body>
    </html>
  );
}

