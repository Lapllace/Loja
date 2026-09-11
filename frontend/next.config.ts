import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

// Gera remotePattern a partir de uma URL base (backend/frontend)
function patternFrom(url: string) {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https' ? '443' : '80'),
      pathname: '/**',
    };
  } catch {
    return null;
  }
}

const remotePatterns = [
  patternFrom(apiUrl),
  patternFrom(siteUrl),
  { protocol: 'https' as const, hostname: '**' },
].filter((p): p is NonNullable<typeof p> => p !== null);

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
    // SVGs são permitidos porque só renderizamos imagens cadastradas
    // pelo administrador (uploads próprios) — nunca conteúdo de usuário público.
    dangerouslyAllowSVG: true,
    // Dev local resolve para 127.0.0.1; em produção, desabilitar se imagens
    // forem servidas por IP privado não confiável.
    dangerouslyAllowLocalIP: true,
    contentDispositionType: 'inline',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Não otimiza imagens pequenas em dev (reduz ruído de logs)
    minimumCacheTTL: 300,
  },
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_SITE_URL: siteUrl,
  },
};

export default nextConfig;
