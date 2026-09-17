import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserStatus, UserRole } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    cpf: null,
    phone: null,
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockUsersService = {
    validateCredentials: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return access token and user on valid credentials', async () => {
      mockUsersService.validateCredentials.mockResolvedValue(mockUser);
      mockAuthService.login.mockReturnValue({
        accessToken: 'test-token',
        user: mockUser,
      });

      const result = await controller.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: 'test-token',
        user: mockUser,
      });
      expect(usersService.validateCredentials).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockUsersService.validateCredentials.mockResolvedValue(null);

      await expect(
        controller.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for blocked users', async () => {
      const blockedUser = { ...mockUser, status: UserStatus.BLOCKED };
      mockUsersService.validateCredentials.mockResolvedValue(blockedUser);

      await expect(
        controller.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow login for PENDING users', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.PENDING };
      mockUsersService.validateCredentials.mockResolvedValue(pendingUser);
      mockAuthService.login.mockReturnValue({
        accessToken: 'test-token',
        user: pendingUser,
      });

      const result = await controller.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: 'test-token',
        user: pendingUser,
      });
    });
  });

  describe('register', () => {
    it('should create user and return access token', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);
      mockAuthService.login.mockReturnValue({
        accessToken: 'test-token',
        user: mockUser,
      });

      const result = await controller.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: 'test-token',
        user: mockUser,
      });
      expect(usersService.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('me', () => {
    it('should return user data from request', async () => {
      const req = { user: mockUser };
      const result = await controller.me(req as any);

      expect(result).toEqual(mockUser);
    });

    it('should not include passwordHash in user data', async () => {
      const req = { user: mockUser };
      const result = await controller.me(req as any);

      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
