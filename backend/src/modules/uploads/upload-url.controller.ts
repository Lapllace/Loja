import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadUrlDto } from './dto/upload-url.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Endpoint dedicado ao campo "Cole a URL da Imagem" do painel administrativo:
 * baixa a imagem remota e devolve a rota estática local (/uploads/...).
 */
@Controller('products')
export class UploadUrlController {
  constructor(private readonly uploadsService: UploadsService) { }

  @Post('upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async uploadFromUrl(@Body() body: UploadUrlDto) {
    const stored = await this.uploadsService.storeImageFromUrl(body.imageUrl);
    return { url: stored.url, fileName: stored.fileName, size: stored.size };
  }
}
