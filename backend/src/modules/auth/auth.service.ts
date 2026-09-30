import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient?: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Cliente do Google criado sob demanda.
   *
   * Antes ele só era criado no construtor: sem a variável de ambiente,
   * `googleClient` ficava indefinido e o erro só aparecia no primeiro login.
   * Agora a variável é validada a cada chamada e o client é reaproveitado.
   */
  private getGoogleClient(clientId: string): OAuth2Client {
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(clientId);
    }
    return this.googleClient;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    return { accessToken: token, user };
  }

  /**
   * Login/cadastro via Google (ID token do Google Identity Services).
   *
   * Ordem de resolução da conta:
   *  1. `googleId` (claim `sub`) — identificador estável da conta;
   *  2. e-mail — vincula o `googleId` a uma conta que já existia;
   *  3. cria a conta (ACTIVE + CUSTOMER) no primeiro acesso.
   *
   * Contas BLOCKED não autenticam nem pelo Google.
   */
  async googleAuth(idToken: string) {
    // Sem a variável não há como validar a audiência (`aud`) do token: o que
    // impediria um ID token emitido para outro app de ser aceito aqui.
    const clientId =
      this.config.get<string>('GOOGLE_CLIENT_ID') ?? process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new UnauthorizedException('Google authentication is not configured');
    }

    let googleId: string | undefined;
    let email: string | undefined;
    let name: string | undefined;

    try {
      const ticket = await this.getGoogleClient(clientId).verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      googleId = payload?.sub;
      email = payload?.email?.trim().toLowerCase() || undefined;
      name = payload?.name?.trim() || undefined;
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!googleId || !email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    // 1) Conta já vinculada a este Google.
    const linkedUser = await this.usersService.findByGoogleId(googleId);
    if (linkedUser) {
      this.assertNotBlocked(linkedUser.status);
      return this.login(linkedUser);
    }

    // 2) Conta existente com o mesmo e-mail: vincula o Google nesta primeira vez.
    const existingUser = await this.usersService.findByEmailInsensitive(email);
    if (existingUser) {
      this.assertNotBlocked(existingUser.status);

      const linked = await this.usersService.linkGoogleAccount(existingUser.id, googleId);
      if (!linked) {
        // A conta tem outro Google vinculado: não sobrescrevemos o vínculo.
        throw new UnauthorizedException('Esta conta já está vinculada a outra conta Google');
      }

      // Relê para devolver o usuário com o vínculo já persistido.
      return this.login(await this.usersService.findOne(existingUser.id));
    }

    // 3) Primeiro acesso: cria a conta pelo Google.
    const createdUser = await this.usersService.createGoogleUser({
      email,
      name: name ?? email.split('@')[0],
      googleId,
    });
    return this.login(createdUser);
  }

  /** Conta bloqueada não autentica por nenhum fluxo. */
  private assertNotBlocked(status: UserStatus) {
    if (status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Conta bloqueada');
    }
  }
}
