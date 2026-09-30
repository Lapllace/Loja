/**
 * Utilitários para sanitização de números de telefone.
 *
 * A Meta Cloud API exige o número no formato E.164 sem o `+`:
 *   - DDI 55 (Brasil) obrigatório;
 *   - Somente dígitos: sem hífens, espaços, parênteses ou `+`.
 *
 * Exemplos de entrada aceita:
 *   +55 (75) 9 9999-0000  →  5575999990000
 *   75999990000           →  5575999990000
 *   5575999990000         →  5575999990000
 *   0075999990000         →  5575999990000   (prefixo de discagem internacional)
 */

/** Remove tudo que não for dígito. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Sanitiza um número de telefone para o formato E.164 sem `+`.
 *
 * Retorna `null` quando o valor for vazio ou resultar em menos de 10 dígitos
 * após a limpeza (muito curto para ser um número válido).
 */
export function sanitizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = digitsOnly(raw);

  // Remove o prefixo de discagem internacional `00`.
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Adiciona o DDI 55 se o número ainda não o tiver.
  // Um DDD válido no Brasil tem 2 dígitos; o número local tem 8-9 dígitos.
  // Portanto um número brasileiro sem DDI tem 10-11 dígitos; com DDI, 12-13.
  if (!digits.startsWith('55')) {
    digits = `55${digits}`;
  }

  // Validação mínima: DDI (2) + DDD (2) + número (8) = 12 dígitos.
  if (digits.length < 12) return null;

  return digits;
}
