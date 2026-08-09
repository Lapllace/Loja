import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  CUSTOMER: 1,
  ADMIN: 2,
  OWNER: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    const userRank = ROLE_HIERARCHY[user.role as UserRole] ?? 0;
    const minRequired = Math.max(...required.map((r) => ROLE_HIERARCHY[r] ?? 0));
    return userRank >= minRequired;
  }
}
