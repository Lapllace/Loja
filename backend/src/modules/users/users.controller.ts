import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateRoleStatusDto } from './dto/update-role-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Req() req: any, @Body() body: CreateUserAdminDto) {
    const authUser = req.user;
    if (body.role && body.role !== UserRole.CUSTOMER && authUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Insufficient permissions to assign role');
    }
    const user = await this.usersService.create(body);
    return user;
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Req() req: any, @Param('id') id: string) {
    const authUser = req.user;
    const target = await this.usersService.findOne(id);
    // CUSTOMER can only access own resource
    if (authUser.role === UserRole.CUSTOMER) {
      if (authUser.id !== id) throw new ForbiddenException('Cannot access other user');
      return target;
    }
    // ADMIN cannot access OWNER
    if (authUser.role === UserRole.ADMIN && target.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot access owner user');
    }
    return target;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateUserDto) {
    const authUser = req.user;
    const target = await this.usersService.findOne(id);
    // Prevent CUSTOMER from updating others or role/status
    if (authUser.role === UserRole.CUSTOMER) {
      if (authUser.id !== id) throw new ForbiddenException('Cannot modify other user');
      return this.usersService.update(id, body);
    }
    // ADMIN restrictions
    if (authUser.role === UserRole.ADMIN) {
      if (target.role === UserRole.OWNER) throw new ForbiddenException('Cannot modify owner');
      return this.usersService.update(id, body);
    }
    // OWNER can update any normal fields
    if (authUser.role === UserRole.OWNER) {
      return this.usersService.update(id, body);
    }
    throw new ForbiddenException();
  }

  @Patch(':id/role-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateRoleStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateRoleStatusDto,
  ) {
    const authUser = req.user;
    const target = await this.usersService.findOne(id);

    if (authUser.role === UserRole.ADMIN) {
      if (target.role === UserRole.OWNER) {
        throw new ForbiddenException('Cannot modify owner role or status');
      }
      if (body.role !== undefined && body.role !== UserRole.CUSTOMER) {
        throw new ForbiddenException('Only OWNER can assign ADMIN or OWNER roles');
      }
      return this.usersService.updateRoleStatus(id, body);
    }

    if (authUser.role === UserRole.OWNER) {
      return this.usersService.updateRoleStatus(id, body);
    }

    throw new ForbiddenException();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: any, @Param('id') id: string) {
    const authUser = req.user;
    const target = await this.usersService.findOne(id);
    // CUSTOMER cannot delete
    if (authUser.role === UserRole.CUSTOMER) throw new ForbiddenException('Insufficient permissions');
    // ADMIN can delete only CUSTOMER
    if (authUser.role === UserRole.ADMIN) {
      if (target.role === UserRole.OWNER) throw new ForbiddenException('Cannot delete owner');
      if (target.role === UserRole.ADMIN) throw new ForbiddenException('Cannot delete admin');
      await this.usersService.remove(id);
      return;
    }
    // OWNER can delete any
    if (authUser.role === UserRole.OWNER) {
      await this.usersService.remove(id);
      return;
    }
    throw new ForbiddenException();
  }
}
