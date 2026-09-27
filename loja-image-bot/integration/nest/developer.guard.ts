import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Backend-only authorization for the image bot.
 * JwtStrategy must load isDeveloper from the database into req.user.
 */
@Injectable()
export class DeveloperGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { isDeveloper?: boolean } }>();
    if (request.user?.isDeveloper === true) return true;
    throw new ForbiddenException('Acesso restrito ao perfil de desenvolvedor.');
  }
}
