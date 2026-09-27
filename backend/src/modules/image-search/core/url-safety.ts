import dns from 'node:dns/promises';
import net from 'node:net';
import { URL } from 'node:url';

function isPrivateIPv4(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) return true;
  const [a, b] = octets;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
}

export async function assertSafePublicImageUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('A URL da imagem deve usar HTTP ou HTTPS.');
  }
  if (url.username || url.password) {
    throw new Error('URLs com credenciais embutidas não são permitidas.');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Host local não permitido.');
  }

  if (net.isIP(hostname) === 4 && isPrivateIPv4(hostname)) {
    throw new Error('Endereço IPv4 privado/local não permitido.');
  }
  if (net.isIP(hostname) === 6 && isPrivateIPv6(hostname)) {
    throw new Error('Endereço IPv6 privado/local não permitido.');
  }

  const resolved = await dns.lookup(hostname, { all: true });
  if (!resolved.length) throw new Error('Não foi possível resolver o host da imagem.');
  for (const entry of resolved) {
    if ((entry.family === 4 && isPrivateIPv4(entry.address)) || (entry.family === 6 && isPrivateIPv6(entry.address))) {
      throw new Error('O host resolve para um endereço de rede privada/local e foi bloqueado.');
    }
  }

  return url;
}
