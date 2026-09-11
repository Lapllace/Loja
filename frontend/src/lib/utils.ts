// Utilitários comuns para a aplicação

/**
 * Converte valor de preço da API (Decimal serializado como string ou número)
 * para number de forma segura. Retorna null quando inválido.
 */
export function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Formata preço para BRL (aceita string vinda do Decimal do Prisma)
 */
export function formatPrice(price: number | string | null | undefined): string {
  const numPrice = toNumber(price);

  if (numPrice === null) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numPrice);
}

/**
 * Formata data para o formato brasileiro
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Trunca texto com ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Calcula porcentagem de desconto (Decimal-safe)
 */
export function calculateDiscountPercentage(
  originalPrice: number | string | null | undefined,
  currentPrice: number | string | null | undefined,
): number {
  const original = toNumber(originalPrice);
  const current = toNumber(currentPrice);

  if (original === null || current === null || original <= current) {
    return 0;
  }

  return Math.round(((original - current) / original) * 100);
}

/**
 * Verifica se produto está em estoque
 */
export function isInStock(stock: number): boolean {
  return stock > 0;
}

/**
 * Formata slug para URL amigável
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Debounce function para busca
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

