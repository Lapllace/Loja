import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RECAPTCHA_ACTION_KEY } from '../decorators/recaptcha-action.decorator';

/**
 * Guard reCAPTCHA v3 (Google Site Verify API).
 *
 * Comportamento quando `RECAPTCHA_SECRET_KEY` não está configurada:
 *   - Loga um aviso único e deixa a requisição passar (modo de desenvolvimento).
 *
 * Token esperado: cabeçalho `x-recaptcha-token` OU campo `recaptchaToken` no body.
 * Score mínimo aceito: 0.5 (padrão do Google para interações humanas).
 */
@Injectable()
export class RecaptchaGuard implements CanActivate {
  private readonly logger = new Logger(RecaptchaGuard.name);

  /** Apenas loga o aviso de bypass uma vez para não poluir os logs. */
  private static bypassLogged = false;

  private static readonly VERIFY_URL =
    'https://www.google.com/recaptcha/api/siteverify';
  private static readonly MIN_SCORE = 0.5;
  private static readonly TIMEOUT_MS = 6_000;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secretKey = this.config.get<string>('RECAPTCHA_SECRET_KEY');

    if (!secretKey) {
      if (!RecaptchaGuard.bypassLogged) {
        this.logger.warn(
          'RECAPTCHA_SECRET_KEY not configured — reCAPTCHA validation bypassed. ' +
            'Set the variable in .env to enable protection.',
        );
        RecaptchaGuard.bypassLogged = true;
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn(
        `reCAPTCHA token missing — ${request.method} ${request.url}`,
      );
      return false;
    }

    const expectedAction = this.reflector.getAllAndOverride<string | undefined>(
      RECAPTCHA_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    return this.verify(secretKey, token, request.ip, expectedAction);
  }

  private extractToken(request: Request): string | null {
    // Cabeçalho tem prioridade; fallback no body para clientes que não podem
    // adicionar cabeçalhos (ex.: formulários HTML puros).
    const header = request.headers['x-recaptcha-token'];
    if (typeof header === 'string' && header.trim()) return header.trim();

    const body = request.body as Record<string, unknown> | undefined;
    const fromBody = body?.recaptchaToken;
    if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim();

    return null;
  }

  private async verify(
    secretKey: string,
    token: string,
    remoteIp: string | undefined,
    expectedAction?: string,
  ): Promise<boolean> {
    const params = new URLSearchParams({ secret: secretKey, response: token });
    if (remoteIp) params.append('remoteip', remoteIp);

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      RecaptchaGuard.TIMEOUT_MS,
    );

    try {
      const response = await fetch(
        `${RecaptchaGuard.VERIFY_URL}?${params.toString()}`,
        { method: 'POST', signal: controller.signal },
      );

      if (!response.ok) {
        this.logger.warn(
          `reCAPTCHA verify HTTP ${response.status} — allowing request (fail-open).`,
        );
        return true; // Fail-open: não bloquear se a API do Google estiver fora.
      }

      const result = (await response.json()) as {
        success?: boolean;
        score?: number;
        action?: string;
        'error-codes'?: string[];
      };

      if (!result.success) {
        this.logger.warn(
          `reCAPTCHA invalid — codes: ${(result['error-codes'] ?? []).join(', ')}`,
        );
        return false;
      }

      const score = result.score ?? 0;
      if (score < RecaptchaGuard.MIN_SCORE) {
        this.logger.warn(
          `reCAPTCHA score too low: ${score} < ${RecaptchaGuard.MIN_SCORE}`,
        );
        return false;
      }

      if (expectedAction && result.action !== expectedAction) {
        this.logger.warn(
          `reCAPTCHA action mismatch: expected '${expectedAction}', got '${result.action}'`,
        );
        return false;
      }

      return true;
    } catch (err) {
      // Timeout ou falha de rede: fail-open para não bloquear usuários legítimos.
      this.logger.warn(
        `reCAPTCHA verify failed (${err instanceof Error ? err.message : String(err)}) — allowing request.`,
      );
      return true;
    } finally {
      clearTimeout(timer);
    }
  }
}
