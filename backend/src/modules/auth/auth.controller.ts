import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RecaptchaGuard } from '../../common/guards/recaptcha.guard';
import { RecaptchaAction } from '../../common/decorators/recaptcha-action.decorator';
import { UserStatus } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RecaptchaGuard)
  @RecaptchaAction('login')
  async login(@Body() body: LoginDto) {
    const user = await this.usersService.validateCredentials(
      body.email,
      body.password,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Impedir login de usuários bloqueados
    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('User account is blocked');
    }

    return this.authService.login(user);
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RecaptchaGuard)
  @RecaptchaAction('register')
  async register(@Body() body: RegisterDto) {
    const createdUser = await this.usersService.create(body);
    return this.authService.login(createdUser);
  }

  @Post('google')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RecaptchaGuard)
  @RecaptchaAction('login')
  async googleAuth(@Body() body: GoogleAuthDto) {
    return this.authService.googleAuth(body.idToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req) {
    // O usuário já é validado pelo JwtAuthGuard e está em req.user
    // JwtStrategy já usa UsersService.findOne que não retorna passwordHash
    return req.user;
  }
}
