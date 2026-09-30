// Utilitário do Google reCAPTCHA v3.
//
// Carrega a SDK oficial (https://www.google.com/recaptcha/api.js?render=SITE_KEY)
// uma única vez por página e expõe `getRecaptchaToken(action)` para os
// formulários que precisam provar "humanidade" ao backend (o token é enviado
// na header `x-recaptcha-token`).
//
// Quando NEXT_PUBLIC_RECAPTCHA_SITE_KEY não está configurada (string vazia ou
// ausente), o reCAPTCHA fica desativado: `getRecaptchaToken` devolve `null` e
// a requisição é enviada SEM a header — o backend decide se aceita ou não.

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';

const SCRIPT_ID = 'recaptcha-v3-script';
const GrecaptchaAction = 'loja';

// Tipagem mínima da SDK (sem depender de @types).
interface Grecaptcha {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

/** `true` quando a chave pública do reCAPTCHA v3 está configurada. */
export function isRecaptchaEnabled(): boolean {
  return SITE_KEY.trim() !== '';
}

let loadingPromise: Promise<void> | null = null;

/** Injeta a SDK no documento (idempotente: resolve de novo se já existe). */
function loadRecaptchaScript(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA só pode ser carregado no browser.'));
  }

  if (window.grecaptcha) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');

    const onReady = () => {
      if (window.grecaptcha) {
        resolve();
      } else {
        reject(new Error('grecaptcha indisponível após carregar a SDK.'));
      }
    };

    script.addEventListener('load', onReady);
    script.addEventListener('error', () =>
      reject(new Error('Falha ao carregar a SDK do reCAPTCHA.')),
    );

    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return loadingPromise;
}

/**
 * Obtém um token do reCAPTCHA v3 para a ação dada.
 *
 * Devolve `null` quando:
 *  - a site key não está configurada (reCAPTCHA desativado);
 *  - a SDK não pôde ser carregada (ex.: adblock/offline);
 *  - a execução falhou.
 *
 * O backend DEVE tolerar requisições sem a header `x-recaptcha-token` quando
 * RECAPTCHA_SECRET_KEY também não está configurada lá.
 */
export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (!isRecaptchaEnabled()) return null;

  try {
    await loadRecaptchaScript();
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha) return null;

    return await new Promise<string | null>((resolve) => {
      grecaptcha.ready(() => {
        grecaptcha
          .execute(SITE_KEY, { action: action || GrecaptchaAction })
          .then((token) => resolve(typeof token === 'string' && token !== '' ? token : null))
          .catch(() => resolve(null));
      });
    });
  } catch {
    // reCAPTCHA nunca deve bloquear o usuário: sem SDK → sem header.
    return null;
  }
}
