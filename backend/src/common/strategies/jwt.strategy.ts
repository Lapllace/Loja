import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../modules/users/users.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: any) {
    try {
      const user = await this.usersService.findOne(payload.sub);
      if (user.status === UserStatus.BLOCKED) {
        throw new ForbiddenException('User account is blocked');
      }
      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }
}
